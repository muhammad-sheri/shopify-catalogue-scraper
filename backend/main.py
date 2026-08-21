"""The catalogue API, as one WSGI application.

Deployed as a Vercel Service (see vercel.json). A single entrypoint rather
than one file per route under `api/`, for two reasons: file-based Python
functions are not built when a project has a JavaScript framework preset —
which is what silently broke the first deploy — and one app means one cold
start and routing this file controls outright.

No web framework. WSGI is a plain callable, the whole API is two GET routes,
and adding Flask or FastAPI here would pull a dependency in to do almost
nothing. Vercel loads the `app` name below directly.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Callable, Iterable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper_api.handler import CACHE_CONTROL, resolve  # noqa: E402
from scraper_api.service import DEFAULT_LIMIT, catalogue_page, store_report  # noqa: E402

ROUTES: dict[str, Callable[[dict[str, str]], dict[str, Any]]] = {
    "/store": lambda q: store_report(q.get("url", "")),
    "/catalogue": lambda q: catalogue_page(
        q.get("url", ""), page=q.get("page", 1), limit=q.get("limit", DEFAULT_LIMIT)
    ),
}


def _route_key(path: str) -> str:
    """Normalise the path to a route key.

    A service may be handed the full public path or the remainder after the
    rewrite matched, so `/api/store` and `/store` both have to land on the
    same route rather than depending on which one Vercel passes through.
    """
    path = (path or "/").rstrip("/") or "/"
    if path.startswith("/api"):
        path = path[len("/api"):] or "/"
    return path


def app(environ: dict[str, Any], start_response: Callable[..., Any]) -> Iterable[bytes]:
    path = _route_key(environ.get("PATH_INFO", ""))
    method = environ.get("REQUEST_METHOD", "GET").upper()

    if method not in ("GET", "HEAD"):
        return _reply(start_response, 405, {"error": f"{method} is not allowed here."}, False)

    route = ROUTES.get(path)
    if route is None:
        return _reply(
            start_response,
            404,
            {"error": f"No route for {path}. Available: {', '.join(sorted(ROUTES))}"},
            False,
        )

    # `resolve` parses the query string and maps errors to statuses, and is
    # shared with the local dev server so the two cannot answer differently.
    status, payload, cache = resolve(route, f"?{environ.get('QUERY_STRING', '')}")
    return _reply(start_response, status, payload, cache)


def _reply(
    start_response: Callable[..., Any], status: int, payload: dict[str, Any], cache: bool
) -> Iterable[bytes]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    start_response(
        f"{status} {_REASONS.get(status, 'OK')}",
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", CACHE_CONTROL if cache else "no-store"),
        ],
    )
    return [body]


_REASONS = {
    200: "OK", 400: "Bad Request", 404: "Not Found",
    405: "Method Not Allowed", 500: "Internal Server Error", 502: "Bad Gateway",
}


if __name__ == "__main__":
    # Local development: `next dev` cannot run Python, so this serves the same
    # app on :5328 and web/next.config.ts rewrites /api/* to it in dev only.
    from wsgiref.simple_server import make_server

    port = int(os.getenv("DEV_API_PORT", "5328"))
    print(f"Catalogue API on http://127.0.0.1:{port}  (routes: {', '.join(sorted(ROUTES))})")
    make_server("127.0.0.1", port, app).serve_forever()
