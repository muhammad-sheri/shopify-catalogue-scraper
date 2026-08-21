"""Server-side glue between Vercel's HTTP functions and the scraper_agent package.

Kept out of `api/` deliberately: Vercel turns every `.py` file under `api/`
into its own public route, so shared code living there would be reachable from
the internet as a half-working endpoint.
"""
