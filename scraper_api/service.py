"""Catalogue reads, expressed as plain dicts an HTTP handler can serialise.

Everything that decides *what* the answer is lives here rather than in the
`api/` handlers, so it can be exercised by calling a function instead of by
standing up a server. The handlers below it only translate dicts into HTTP.

The scraping itself is not reimplemented. `check_store`, `products_endpoint`
and `flatten_product` are imported from `scraper_agent`, the same package the
CLI and the Streamlit app run, so this deployment cannot drift from them.
"""

from __future__ import annotations

import dataclasses
import json
from typing import Any

from scraper_agent import http
from scraper_agent.config import Settings
from scraper_agent.http import HttpError
from scraper_agent.shopify import (
    MAX_PAGE_SIZE,
    check_store,
    fetch_store_meta,
    flatten_product,
    products_endpoint,
)

from scraper_api.guard import UnsafeUrl, safe_store_url

#: Products per request. Shopify allows up to 250, but a store with many
#: size/colour combinations turns 250 products into thousands of variant rows,
#: and Vercel caps a function response at 4.5 MB. 100 keeps the payload well
#: inside that on realistic catalogues and makes progress visibly smoother.
DEFAULT_LIMIT = 100

#: Descriptions are by far the largest field and nothing in the UI shows them
#: in full, so they are cut down before they ever reach the wire.
DESCRIPTION_CHARS = 500

#: Serialised-payload ceiling. Under Vercel's 4.5 MB limit with room for
#: headers and encoding overhead; crossing it drops descriptions entirely.
PAYLOAD_BUDGET = 3_500_000

#: A store that ignores `?page` would otherwise be paged forever.
MAX_PAGE = 200


class ServiceError(RuntimeError):
    """A failure with an HTTP status already decided."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _settings() -> Settings:
    """Env settings, adjusted for one-page-per-invocation serverless reads.

    `politeness_delay` exists to space out a long paging loop inside one
    process. Here each page is its own invocation, so the delay would only
    add latency to a request the user is waiting on.
    """
    settings = Settings.from_env()
    return dataclasses.replace(
        settings,
        politeness_delay=0.0,
        request_timeout=min(settings.request_timeout, 20.0),
    )


def store_report(raw_url: str) -> dict[str, Any]:
    """Is this Shopify, and can its catalogue be read? Two questions, two answers.

    Collapsing them tells gymshark.com and fashionnova.com they are not Shopify
    stores, which is false and was fixed upstream; the split is preserved here.
    """
    url = _checked(raw_url)
    settings = _settings()

    check = check_store(url, settings)
    meta = fetch_store_meta(url, settings) if check.is_shopify else {}

    return {
        "url": url,
        "is_shopify": check.is_shopify,
        "catalogue_available": check.catalogue_available,
        "status": check.status,
        "detail": check.detail,
        "endpoint": products_endpoint(url),
        "meta": {
            "name": meta.get("name"),
            "currency": meta.get("currency"),
            "country": meta.get("country"),
            "domain": meta.get("domain"),
        },
    }


def catalogue_page(raw_url: str, page: int = 1, limit: int = DEFAULT_LIMIT) -> dict[str, Any]:
    """One page of the store's catalogue, flattened to one row per variant."""
    url = _checked(raw_url)
    page = _bounded(page, 1, MAX_PAGE, "page")
    limit = _bounded(limit, 1, MAX_PAGE_SIZE, "limit")

    endpoint = products_endpoint(url)
    settings = _settings()

    try:
        response = http.get(
            endpoint,
            params={"limit": limit, "page": page},
            timeout=settings.request_timeout,
            user_agent=settings.user_agent,
            headers={"Accept": "application/json"},
        )
    except HttpError as exc:
        raise ServiceError(f"Could not read {endpoint}: {exc}", 502) from exc

    if response.status_code == 404:
        raise ServiceError(
            f"{endpoint} returned 404. The store may not expose its product API.", 404
        )
    if response.status_code >= 400:
        raise ServiceError(f"{endpoint} returned HTTP {response.status_code}.", 502)

    try:
        products = response.json().get("products") or []
    except ValueError as exc:
        raise ServiceError(f"{endpoint} did not return JSON.", 502) from exc

    rows: list[dict[str, Any]] = []
    for product in products:
        rows.extend(flatten_product(product, url))

    for row in rows:
        row["description"] = _clip(row.get("description"), DESCRIPTION_CHARS)

    payload = {
        "url": url,
        "page": page,
        "limit": limit,
        "products": len(products),
        "rows": rows,
        # Matches the stopping rule in scraper_agent.fetch_products: a short
        # page means the catalogue ran out. The client must also stop when a
        # page yields no product ids it has not already seen, because some
        # stores ignore ?page and serve page 1 forever.
        "has_more": len(products) == limit,
        "descriptions_trimmed": False,
    }

    return _within_budget(payload)


def _within_budget(payload: dict[str, Any]) -> dict[str, Any]:
    """Drop descriptions if the response would exceed what Vercel will send.

    Losing a truncated description is a far better outcome than a 413 that
    loses the entire page of products.
    """
    if len(json.dumps(payload, ensure_ascii=False)) <= PAYLOAD_BUDGET:
        return payload
    for row in payload["rows"]:
        row["description"] = None
    payload["descriptions_trimmed"] = True
    return payload


def _clip(value: Any, limit: int) -> str | None:
    if not value:
        return None
    text = str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _checked(raw_url: str) -> str:
    try:
        return safe_store_url(raw_url)
    except UnsafeUrl as exc:
        raise ServiceError(str(exc), 400) from exc


def _bounded(value: Any, low: int, high: int, name: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ServiceError(f"{name} must be a whole number.", 400) from exc
    if not low <= number <= high:
        raise ServiceError(f"{name} must be between {low} and {high}.", 400)
    return number
