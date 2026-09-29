"""Product page scraper for Amazon, Flipkart, Myntra + Schema.org JSON-LD & generic fallback."""

import json
import random
import re
from typing import Any, Optional
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.utils.logger import get_logger

logger = get_logger(__name__)

USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) "
        "Gecko/20100101 Firefox/127.0"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.5 Safari/605.1.15"
    ),
]

REQUEST_TIMEOUT = 15

# Matches e.g. "₹ 1,299.00", "$1,299", "Rs. 1,299", "1,299"
_PRICE_RE = re.compile(r"[\d,]+\.?\d*")


def get_headers(url: str = "") -> dict[str, str]:
    """Return realistic browser headers with a random user-agent.
    Flipkart serves complete Schema.org JSON-LD and price tags to modern mobile user-agents.
    """
    if url and "flipkart." in url.lower():
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def extract_price_from_text(text: str) -> Optional[float]:
    """Extract the first numeric price from free text.

    Handles currency symbols/prefixes (Rs, INR, $, USD, etc.) and
    thousand separators. Returns None when no price is found.
    """
    if not text:
        return None
    cleaned = text.strip()
    for token in ("Rs.", "Rs", "INR", "USD", "₹", "$", "£", "€"):
        cleaned = cleaned.replace(token, " ")
    match = _PRICE_RE.search(cleaned)
    if not match:
        return None
    numeric = match.group(0).replace(",", "").strip().rstrip(".")
    try:
        value = float(numeric)
        return value if value > 0 else None
    except ValueError:
        return None


def extract_name_from_url(url: str) -> str:
    """Extract a clean, readable product name from the URL path slug as fallback."""
    try:
        parsed = urlparse(url)
        path = unquote(parsed.path).strip("/")
        parts = [p for p in path.split("/") if p]
        host = parsed.netloc.lower()

        # Amazon: /Sony-WH-1000XM5-Headphones/dp/B09XS7JWHH
        if "amazon." in host:
            for i, part in enumerate(parts):
                if part.lower() in ("dp", "gp", "d") and i > 0:
                    slug = parts[i - 1]
                    name = re.sub(r"[-_+]+", " ", slug).strip()
                    if name and len(name) > 3 and not name.lower().startswith("b0"):
                        return name.title()
            if parts and len(parts[0]) > 3:
                name = re.sub(r"[-_+]+", " ", parts[0]).strip()
                if not name.lower().startswith("dp"):
                    return name.title()

        # Flipkart: /apple-iphone-15-black-128-gb/p/itm...
        if "flipkart." in host and parts:
            name = re.sub(r"[-_+]+", " ", parts[0]).strip()
            if name:
                return name.title()

        # Myntra: /brand/slug/buy
        if "myntra." in host and len(parts) >= 2:
            name = re.sub(r"[-_+]+", " ", f"{parts[0]} {parts[1]}").strip()
            if name:
                return name.title()

        # Generic: find longest slug part
        candidates = [re.sub(r"[-_+]+", " ", p).strip() for p in parts if len(p) > 3]
        if candidates:
            return max(candidates, key=len).title()
    except Exception:
        pass
    return "Tracked Product"


def _first_text(soup: BeautifulSoup, selectors: list[str]) -> Optional[str]:
    """Return stripped text of the first selector that matches with content."""
    for selector in selectors:
        try:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(strip=True)
                if text:
                    return text
        except Exception:
            continue
    return None


def _first_image(soup: BeautifulSoup, selectors: list[str], base_url: str = "") -> Optional[str]:
    """Return src of the first image selector that yields a usable URL."""
    for selector in selectors:
        try:
            el = soup.select_one(selector)
            if el:
                src = (
                    el.get("src")
                    or el.get("data-old-hires")
                    or el.get("data-src")
                    or el.get("data-lazy-src")
                    or el.get("data-original")
                )
                if src:
                    src = str(src).strip()
                    if src.startswith("http://") or src.startswith("https://"):
                        return src
                    if src.startswith("//"):
                        return "https:" + src
                    if base_url:
                        return urljoin(base_url, src)
        except Exception:
            continue

    # Fallback: Open Graph or Twitter image
    for meta_sel in ('meta[property="og:image"]', 'meta[name="twitter:image"]', 'link[rel="image_src"]'):
        try:
            og = soup.select_one(meta_sel)
            if og:
                content = og.get("content") or og.get("href")
                if content:
                    src = str(content).strip()
                    if src.startswith("http"):
                        return src
                    if src.startswith("//"):
                        return "https:" + src
                    if base_url:
                        return urljoin(base_url, src)
        except Exception:
            continue
    return None


def extract_json_ld(soup: BeautifulSoup, base_url: str = "") -> tuple[Optional[str], Optional[float], Optional[str], Optional[float]]:
    """Extract product details from Schema.org JSON-LD scripts."""
    title, price, image, original_price = None, None, None, None
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            if not tag.string:
                continue
            data = json.loads(tag.string)
            items = data if isinstance(data, list) else [data]
            if isinstance(data, dict) and "@graph" in data:
                items.extend(data["@graph"])

            for item in items:
                if not isinstance(item, dict):
                    continue
                type_ = item.get("@type")
                if type_ == "Product" or (isinstance(type_, list) and "Product" in type_):
                    if not title and item.get("name"):
                        title = str(item["name"]).strip()
                    if not image and item.get("image"):
                        img_val = item["image"]
                        if isinstance(img_val, list) and img_val:
                            image = str(img_val[0])
                        elif isinstance(img_val, dict):
                            image = img_val.get("url")
                        elif isinstance(img_val, str):
                            image = img_val

                    offers = item.get("offers")
                    if isinstance(offers, dict):
                        p_val = offers.get("price") or offers.get("lowPrice")
                        if p_val and price is None:
                            price = extract_price_from_text(str(p_val))
                        high_val = offers.get("highPrice")
                        if high_val and original_price is None:
                            original_price = extract_price_from_text(str(high_val))
                    elif isinstance(offers, list) and offers:
                        first = offers[0]
                        if isinstance(first, dict):
                            p_val = first.get("price") or first.get("lowPrice")
                            if p_val and price is None:
                                price = extract_price_from_text(str(p_val))
        except Exception:
            continue
    if image and base_url and not image.startswith("http"):
        image = urljoin(base_url, image)
    return title, price, image, original_price


def scrape_amazon(soup: BeautifulSoup, url: str) -> tuple[Optional[str], Optional[float], Optional[str], Optional[float]]:
    """Scrape title, price, image and original MRP from an Amazon product page."""
    title = _first_text(soup, [
        "#productTitle",
        "#title",
        "h1 span#productTitle",
        "span#productTitle",
        "h1.a-size-large",
    ])
    price_text = _first_text(
        soup,
        [
            "span.a-price span.a-offscreen",
            "#corePrice_desktop .a-price .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
            "#apex_desktop .a-price .a-offscreen",
            "span.a-price-whole",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
            ".a-price .a-offscreen",
        ],
    )
    mrp_text = _first_text(
        soup,
        [
            "span.basisPrice .a-offscreen",
            "span.a-text-price span.a-offscreen",
            "#corePriceDisplay_desktop_feature_div span.a-text-price span.a-offscreen",
        ],
    )
    image = _first_image(soup, ["#landingImage", "#imgTagWrapperId img", "#main-image", "img#landingImage"], url)
    price = extract_price_from_text(price_text or "")
    mrp = extract_price_from_text(mrp_text or "")
    return title, price, image, mrp


def scrape_flipkart(soup: BeautifulSoup, url: str) -> tuple[Optional[str], Optional[float], Optional[str], Optional[float]]:
    """Scrape title, price, image and MRP from a Flipkart product page."""
    # 1. Try Schema.org JSON-LD first (high fidelity, reliable on mobile Flipkart)
    j_title, j_price, j_image, j_mrp = extract_json_ld(soup, url)

    # 2. HTML elements as fallback / augmentation
    title = j_title or _first_text(soup, ["span.B_NuCI", "h1 span", "h1.VU-ZEz", "span.VU-ZEz", "h1", ".B_NuCI"])
    price_text = _first_text(
        soup,
        [
            "div.Nx9bqj.CxhGGd",
            "div.Nx9bqj",
            "div._30jeq3._16Jk6d",
            "div._30jeq3",
            "div._25b18c .Nx9bqj",
            "._30jeq3",
        ],
    )
    mrp_text = _first_text(soup, ["div._3I9_wc", "div.yRaY8j", "div._25b18c .yRaY8j"])
    image = j_image or _first_image(soup, ["img._396cs4", "img.q6DClP", "img.DByuf4", "img._53J4C-", "._396cs4"], url)
    price = j_price if j_price is not None else extract_price_from_text(price_text or "")
    mrp = j_mrp if j_mrp is not None else extract_price_from_text(mrp_text or "")
    return title, price, image, mrp


def scrape_myntra(soup: BeautifulSoup, url: str) -> tuple[Optional[str], Optional[float], Optional[str], Optional[float]]:
    """Scrape title, price, image and MRP from a Myntra product page."""
    title = _first_text(
        soup,
        [
            "h1.pdp-title",
            "h1.pdp-name",
            ".pdp-title",
            ".pdp-name",
            "h1",
        ],
    )
    brand = _first_text(soup, ["h1.pdp-title"])
    name = _first_text(soup, ["h1.pdp-name"])
    if brand and name and title in (brand, name):
        title = f"{brand} {name}".strip()

    price_text = _first_text(
        soup,
        [
            "span.pdp-price strong",
            "span.pdp-price",
            ".pdp-price strong",
            ".pdp-price",
        ],
    )
    mrp_text = _first_text(soup, ["span.pdp-mrp", ".pdp-mrp"])
    image = _first_image(soup, ["img.pdp-image", ".image-grid-image", ".pdp-image"], url)
    price = extract_price_from_text(price_text or "")
    mrp = extract_price_from_text(mrp_text or "")
    return title, price, image, mrp


def scrape_generic(soup: BeautifulSoup, url: str) -> tuple[Optional[str], Optional[float], Optional[str], Optional[float]]:
    """Best-effort fallback for unknown sites (Schema.org JSON-LD + OG tags + common selectors)."""
    # 1. Try structured JSON-LD first
    j_title, j_price, j_image, j_mrp = extract_json_ld(soup, url)

    # 2. Page headings & OpenGraph
    title = j_title or _first_text(soup, ["h1", 'meta[property="og:title"]', 'meta[name="twitter:title"]', "title"])
    og_title = soup.select_one('meta[property="og:title"]')
    if og_title and og_title.has_attr("content") and not title:
        title = str(og_title["content"]).strip()

    # 3. Price selectors
    price = j_price
    if price is None:
        price_text = _first_text(
            soup,
            [
                'meta[property="product:price:amount"]',
                'meta[property="og:price:amount"]',
                '[itemprop="price"]',
                ".price",
                ".product-price",
                ".selling-price",
                ".current-price",
                ".sale-price",
                "[class*='price']",
                "span.a-offscreen",
            ],
        )
        if not price_text:
            body = soup.get_text(separator=" ", strip=True)
            for m in re.finditer(r"(?:₹|Rs\.?|INR|\$)\s*([\d,]+\.?\d*)", body):
                price_text = m.group(0)
                break
        price = extract_price_from_text(price_text or "")

    # 4. Image
    image = j_image or _first_image(soup, ["img.product-image", "img.main-image", "img"], url)
    mrp = j_mrp
    return title, price, image, mrp


def scrape_product(url: str) -> dict[str, Any]:
    """Fetch `url` and extract product name, price, original_price and image.

    Returns a dict with keys: ``product_name``, ``current_price``, ``original_price``,
    ``image_url``, ``status`` (``success``/``failed``) and optionally ``error``.
    Never raises — failures are reported via ``status='failed'``.
    """
    slug_name = extract_name_from_url(url)
    try:
        headers = get_headers(url)
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

        # Check for genuine bot challenge or block
        is_blocked = resp.status_code in (403, 503) or (
            resp.status_code == 200
            and any(
                phrase in resp.text.lower()
                for phrase in (
                    "<title>robot check</title>",
                    "click the button below to continue shopping",
                    "enter the characters you see below",
                    "cf-browser-verification",
                    "attention required! | cloudflare",
                    "<title>just a moment...</title>",
                )
            )
        )

        if is_blocked:
            logger.warning("Scrape challenged by anti-bot for %s: HTTP %s", url, resp.status_code)
            return {
                "product_name": slug_name,
                "current_price": None,
                "original_price": None,
                "image_url": None,
                "status": "failed",
                "error": f"Store returned anti-bot challenge (HTTP {resp.status_code}). Product created with name from link; price can be set via Edit.",
            }

        if resp.status_code != 200:
            logger.warning("Scrape failed for %s: HTTP %s", url, resp.status_code)
            return {
                "product_name": slug_name,
                "current_price": None,
                "original_price": None,
                "image_url": None,
                "status": "failed",
                "error": f"HTTP {resp.status_code}",
            }

        soup = BeautifulSoup(resp.content, "lxml")
        lowered = url.lower()
        mrp: Optional[float] = None

        if "amazon." in lowered:
            title, price, image, mrp = scrape_amazon(soup, url)
        elif "flipkart." in lowered:
            title, price, image, mrp = scrape_flipkart(soup, url)
        elif "myntra." in lowered:
            title, price, image, mrp = scrape_myntra(soup, url)
        else:
            title, price, image, mrp = scrape_generic(soup, url)

        # Generic fallback fills gaps left by site-specific parsers
        if price is None or not title:
            g_title, g_price, g_image, g_mrp = scrape_generic(soup, url)
            title = title or g_title
            price = price if price is not None else g_price
            image = image or g_image
            mrp = mrp or g_mrp

        final_title = (title or "").strip() or slug_name

        if price is None and not title:
            return {
                "product_name": slug_name,
                "current_price": None,
                "original_price": mrp,
                "image_url": image,
                "status": "failed",
                "error": "Could not extract price from page",
            }

        return {
            "product_name": final_title,
            "current_price": price,
            "original_price": mrp,
            "image_url": image,
            "status": "success" if price is not None else "failed",
            **({} if price is not None else {"error": "Price not found on page"}),
        }

    except requests.RequestException as exc:
        logger.warning("Scrape request failed for %s: %s", url, exc)
        return {
            "product_name": slug_name,
            "current_price": None,
            "original_price": None,
            "image_url": None,
            "status": "failed",
            "error": str(exc),
        }
    except Exception as exc:
        logger.exception("Unexpected scrape error for %s", url)
        return {
            "product_name": slug_name,
            "current_price": None,
            "original_price": None,
            "image_url": None,
            "status": "failed",
            "error": str(exc),
        }
