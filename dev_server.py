"""Serve the `api/` routes locally, because `next dev` cannot run Python.

On Vercel each file under `api/` becomes its own function. Locally there is no
such router, so this stands one up on port 5328 and `next.config.ts` rewrites
`/api/*` to it in development only. Production traffic never touches this file.

    python3 dev_server.py

Routing and error mapping come from `scraper_api.handler.resolve`, the same
code path the deployed functions use, so local behaviour matches the deploy.
"""

from __future__ import annotations

import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper_api.handler import resolve, write_json  # noqa: E402
from scraper_api.service import DEFAULT_LIMIT, catalogue_page, store_report  # noqa: E402

PORT = int(os.getenv("DEV_API_PORT", "5328"))

ROUTES = {
    "/api/store": lambda q: store_report(q.get("url", "")),
    "/api/catalogue": lambda q: catalogue_page(
        q.get("url", ""), page=q.get("page", 1), limit=q.get("limit", DEFAULT_LIMIT)
    ),
}


class DevRouter(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - name fixed by BaseHTTPRequestHandler
        route = ROUTES.get(urlparse(self.path).path.rstrip("/"))
        if route is None:
            write_json(self, 404, {"error": f"No route for {self.path}"}, False)
            return
        status, payload, cache = resolve(route, self.path)
        write_json(self, status, payload, cache)

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write(f"  api  {fmt % args}\n")


if __name__ == "__main__":
    print(f"Scraper API on http://127.0.0.1:{PORT}  (routes: {', '.join(ROUTES)})")
    ThreadingHTTPServer(("127.0.0.1", PORT), DevRouter).serve_forever()
