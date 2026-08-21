"""GET /api/catalogue?url=…&page=1&limit=100 — one page of variant rows."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper_api.handler import json_route  # noqa: E402
from scraper_api.service import DEFAULT_LIMIT, catalogue_page  # noqa: E402

handler = json_route(
    lambda q: catalogue_page(
        q.get("url", ""),
        page=q.get("page", 1),
        limit=q.get("limit", DEFAULT_LIMIT),
    )
)
