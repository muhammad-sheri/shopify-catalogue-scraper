"""GET /api/store?url=… — is this Shopify, and can its catalogue be read?"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper_api.handler import json_route  # noqa: E402
from scraper_api.service import store_report  # noqa: E402

handler = json_route(lambda q: store_report(q.get("url", "")))
