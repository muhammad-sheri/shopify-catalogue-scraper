"""Request-to-response rules shared by the API's routes.

`resolve` owns query parsing and the mapping from failure to HTTP status, so
adding a route to `main.py` never means restating how errors become statuses.
"""

from __future__ import annotations

from typing import Any, Callable
from urllib.parse import parse_qs, urlparse

from scraper_api.service import ServiceError

#: Catalogues change on the order of hours, not seconds. Letting Vercel's CDN
#: hold a response means a shared demo link does not re-hit the storefront for
#: every visitor, which is both faster and politer.
CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600"

Service = Callable[[dict[str, str]], dict[str, Any]]


def resolve(service: Service, path: str) -> tuple[int, dict[str, Any], bool]:
    """Run a service against a request path. Returns (status, payload, cacheable)."""
    query = {
        key: values[0]
        for key, values in parse_qs(urlparse(path).query).items()
        if values
    }
    try:
        return 200, service(query), True
    except ServiceError as exc:
        return exc.status, {"error": str(exc)}, False
    except Exception as exc:  # noqa: BLE001 - a 500 with a reason beats a blank 500
        return 500, {"error": f"{type(exc).__name__}: {exc}"}, False
