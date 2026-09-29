import ipaddress
from urllib.parse import urlparse

FORBIDDEN_HOSTS = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
}


def is_valid_url(url: str) -> bool:
    """Return True if `url` is a valid public HTTP/HTTPS URL and not a private/SSRF target."""
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname or hostname in FORBIDDEN_HOSTS:
            return False
        # Block internal and cloud metadata IP ranges (RFC 1918 & 3927)
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        except ValueError:
            # It's a standard domain name (e.g., amazon.in, flipkart.com)
            pass
        return True
    except Exception:
        return False


def normalize_url(url: str) -> str:
    """Normalise a URL: strip whitespace, add scheme if missing, drop fragment."""
    cleaned = (url or "").strip()
    if not cleaned:
        return cleaned
    if "://" not in cleaned:
        cleaned = "https://" + cleaned
    try:
        parsed = urlparse(cleaned)
        # Drop fragment, keep path/query. Normalise scheme+host to lowercase.
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()
        path = parsed.path or ""
        query = f"?{parsed.query}" if parsed.query else ""
        normalized = f"{scheme}://{netloc}{path}{query}"
        # Remove trailing slash for bare domains (https://example.com/ -> https://example.com)
        if path == "/" and not parsed.query:
            normalized = f"{scheme}://{netloc}"
        return normalized
    except Exception:
        return cleaned


def supported_site(url: str) -> str:
    """Identify the e-commerce site for a URL.

    Returns one of: ``amazon``, ``flipkart``, ``myntra``, ``other``, ``unsupported``.
    """
    if not is_valid_url(url):
        # Allow scheme-less but otherwise valid hostnames.
        candidate = normalize_url(url)
        if not is_valid_url(candidate):
            return "unsupported"
        url = candidate
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return "unsupported"
    if "amazon." in host:
        return "amazon"
    if "flipkart." in host:
        return "flipkart"
    if "myntra." in host:
        return "myntra"
    if not host:
        return "unsupported"
    return "other"
