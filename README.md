# Shopify Catalogue Scraper

Point it at any Shopify store and get the whole catalogue as structured rows — one per
variant, carrying the store's own SKUs, prices, discounts and stock flags.

A Next.js front end for [`web-scraping-ai-agent`](https://github.com/muhammad-sheri/web-scraping-ai-agent),
deployed on Vercel. There is no model and no API key: every Shopify storefront publishes its
catalogue as JSON at `/products.json`, so the numbers here are the store's own records rather
than anything inferred from a page.

## How it fits together

```
                    vercel.json  ──  two services, one domain
                         │
Browser  ──►  /(.*)   ──►  web service      web/       Next.js: UI, filtering, export
         └──►  /api/(.*) ──►  api service   backend/   WSGI app over scraper_agent
```

`backend/main.py` is a plain WSGI application — no web framework, since the API is two GET
routes. It is a **service** rather than file-based functions under `api/` because a project
with a JavaScript framework preset does not build root `api/*.py` at all: Next.js owns the
routing, the Python is never turned into functions, and `/api/store` quietly returns the
frontend's HTML. That failure is silent at build time, which is what makes it worth writing
down.

The scraping is **not** reimplemented here. `requirements.txt` installs `scraper_agent` straight
from its own repository, so this deployment runs the same code as that project's CLI and
Streamlit app, and picks up fixes there on its next build.

Filtering and grouping *are* ported, in `web/lib/catalogue.ts`, because they have to run in the
browser — that is what makes narrowing 2,800 rows feel instant. `web/lib/catalogue.test.ts` mirrors
the Python suite's cases so the two implementations are held to the same behaviour.

### Why the catalogue arrives one page at a time

Vercel caps a function response at 4.5 MB, and a mid-sized store is thousands of variant rows.
The browser therefore requests one page per call and accumulates. That also means real progress
instead of a spinner, and it moves the loop guard client-side: `web/lib/useCatalogue.ts` stops when
a page is empty, when it yields no product IDs it has not already seen (some stores ignore
`?page` and replay page 1 forever), when a page comes back short, at the user's product cap, or
at a hard ceiling of 200 pages.

## Running locally

`next dev` cannot run Python, so the API runs beside it in two terminals:

```bash
# backend, in one terminal
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python main.py          # :5328

# frontend, in another
cd web
npm install
npm run dev                       # :3000, rewrites /api/* to :5328 in dev only
```

In production there is no proxy: Vercel routes `/api/*` to the backend service itself.

```bash
cd web && npm test    # port-equivalence tests against the Python suite's cases
cd web && npm run lint && npm run build
```

## API

| Route | Returns |
|---|---|
| `GET /api/store?url=` | Whether the store is Shopify, whether its catalogue can be read, plus name/currency/country |
| `GET /api/catalogue?url=&page=&limit=` | One page of variant rows, with `has_more` |

The two questions the first route answers are deliberately separate. gymshark.com serves 403 to
its product API and fashionnova.com serves 404, but both plainly *are* Shopify stores — reporting
them as "not a Shopify store" would be a wrong answer, not a graceful failure.

Both routes refuse URLs that resolve to private, loopback or link-local addresses; this service
fetches user-supplied URLs from inside Vercel's network, and without that check it would be an
open proxy into it.

## Notes

- Free to run. No LLM calls, no keys, nothing billed.
- Product descriptions are truncated to 500 characters, and dropped entirely if a response would
  otherwise exceed the size limit. The UI says so when it happens.
- Responses are cached at the CDN for five minutes, so a shared link does not re-hit the
  storefront for every visitor.
