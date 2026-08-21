"""Turning a service function into a Vercel Python function.

Vercel maps each `.py` file under `api/` to a route and calls the class named
`handler`. Both routes differ only in which service function they call, so
that difference is all the handler modules should have to express.

`resolve` holds the request-to-response rules — query parsing, error-to-status
mapping — so the deployed handlers and the local dev server in `dev_server.py`
cannot answer differently.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
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


def write_json(
    sink: BaseHTTPRequestHandler, status: int, payload: dict[str, Any], cache: bool
) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sink.send_response(status)
    sink.send_header("Content-Type", "application/json; charset=utf-8")
    sink.send_header("Content-Length", str(len(body)))
    sink.send_header("Cache-Control", CACHE_CONTROL if cache else "no-store")
    sink.end_headers()
    sink.wfile.write(body)


def json_route(service: Service) -> type[BaseHTTPRequestHandler]:
    """Build the handler class Vercel loads from a file under `api/`."""

    class Route(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - name fixed by BaseHTTPRequestHandler
            status, payload, cache = resolve(service, self.path)
            write_json(self, status, payload, cache)

        def log_message(self, *args: Any) -> None:
            """Silence per-request logging; Vercel records requests already."""

    return Route
