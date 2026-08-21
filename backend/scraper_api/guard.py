"""Refuse URLs that point back into private infrastructure.

This service fetches whatever URL a caller supplies, from inside Vercel's
network. Without a check, `http://169.254.169.254/...` or `http://localhost:6379`
turns the deployment into a proxy for scanning things that were never meant to
be public. That class of bug is server-side request forgery, and the fix is to
resolve the host up front and refuse anything that is not a public address.

Known limitation, stated rather than hidden: this validates the URL the caller
gave us, but `scraper_agent.http` follows redirects, so a hostile server could
still answer with a 302 pointing somewhere private. Shopify storefronts do not
do this, and the endpoints we read are fixed paths on the host the caller
named, so the exposure is small. Closing it properly needs a redirect-aware
transport, which is a change to the core package rather than to this shim.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse, urlunparse

#: Ports a storefront is plausibly served from. Anything else is far more
#: likely to be someone probing an internal service than a real shop.
ALLOWED_PORTS = frozenset({80, 443})


class UnsafeUrl(ValueError):
    """Raised when a URL must not be fetched."""


def _is_public(ip: str) -> bool:
    address = ipaddress.ip_address(ip)
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local      # 169.254.0.0/16, the cloud metadata range
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    )


def safe_store_url(raw: str) -> str:
    """Normalise a user-supplied store URL, or raise `UnsafeUrl`.

    Returns the scheme://host[:port] root with the path preserved, so a
    collection URL still maps to its own products endpoint downstream.
    """
    candidate = (raw or "").strip()
    if not candidate:
        raise UnsafeUrl("A store URL is required.")
    if "://" not in candidate:
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeUrl("Only http and https URLs can be fetched.")
    if not parsed.hostname:
        raise UnsafeUrl("That URL has no hostname.")
    if parsed.port is not None and parsed.port not in ALLOWED_PORTS:
        raise UnsafeUrl(f"Port {parsed.port} is not allowed; use 80 or 443.")

    try:
        resolved = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise UnsafeUrl(f"{parsed.hostname} could not be resolved.") from exc

    # Every address the name resolves to has to be public. Checking only the
    # first would let a name with one public and one private record through.
    for entry in resolved:
        ip = entry[4][0]
        try:
            if not _is_public(ip):
                raise UnsafeUrl(
                    f"{parsed.hostname} resolves to {ip}, which is not a public address."
                )
        except ValueError as exc:
            if isinstance(exc, UnsafeUrl):
                raise
            raise UnsafeUrl(f"{parsed.hostname} resolved to an unreadable address.") from exc

    return urlunparse(parsed)
