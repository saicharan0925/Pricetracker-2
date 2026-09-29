"""Price-check orchestration: scrape, persist, optionally notify."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.models import PriceHistory, Product
from app.services import email_service
from app.services.scraper import scrape_product
from app.utils.logger import get_logger

logger = get_logger(__name__)


def check_and_update_price(db: Session, product: Product, send_email: bool = True) -> dict[str, Any]:
    """Scrape the live price for `product`, persist it and mail on a drop.

    Steps:
      1. Scrape the product URL (never raises — failures are captured).
      2. Update ``current_price`` / ``last_checked`` / ``updated_at``.
      3. Insert a :class:`PriceHistory` row when a price was found.
      4. Send a price-drop email when ``current_price <= desired_price``.

    Returns a result dict with ``status``, ``current_price``, ``email_sent`` etc.
    """
    result: dict[str, Any] = {
        "product_id": product.id,
        "product_name": product.name,
        "desired_price": product.desired_price,
        "current_price": product.current_price,
        "price_dropped": False,
        "email_sent": False,
        "status": "failed",
        "message": "",
    }

    scraped = scrape_product(product.url)
    now = datetime.now(timezone.utc)

    if scraped.get("status") != "success" or scraped.get("current_price") is None:
        error = scraped.get("error", "Scrape failed")
        product.last_checked = now
        product.updated_at = now
        try:
            db.commit()
            db.refresh(product)
        except Exception as exc:
            db.rollback()
            logger.error("DB commit failed for product %s: %s", product.id, exc)
        result.update({"status": "failed", "message": error, "last_checked": product.last_checked})
        logger.warning("Price check failed for product %s (%s): %s", product.id, product.url, error)
        return result

    new_price = float(scraped["current_price"])
    product.current_price = new_price
    product.last_checked = now
    product.updated_at = now
    # Backfill image when the scraper found one and we have none.
    if scraped.get("image_url") and not product.image_url:
        product.image_url = scraped["image_url"]
    if scraped.get("original_price") and not product.original_price:
        product.original_price = float(scraped["original_price"])

    try:
        db.add(PriceHistory(product_id=product.id, price=new_price, checked_at=now))
        db.commit()
        db.refresh(product)
    except Exception as exc:
        db.rollback()
        logger.error("DB commit failed for product %s: %s", product.id, exc)
        result.update({"status": "failed", "message": "Database error", "current_price": new_price})
        return result

    price_dropped = new_price <= product.desired_price
    email_sent = False
    if price_dropped and send_email:
        try:
            email_sent = email_service.send_price_drop_email(
                to_email=product.email,
                product_name=product.name,
                current_price=new_price,
                desired_price=product.desired_price,
                product_url=product.url,
            )
        except Exception as exc:  # never break price checks on mail failure
            logger.error("Price-drop email failed for product %s: %s", product.id, exc)
            email_sent = False

    result.update(
        {
            "current_price": new_price,
            "price_dropped": price_dropped,
            "email_sent": email_sent,
            "last_checked": product.last_checked,
            "status": "success",
            "message": (
                f"Price Rs.{new_price:,.2f} is at/below target Rs.{product.desired_price:,.2f}"
                if price_dropped
                else f"Price Rs.{new_price:,.2f} is above target Rs.{product.desired_price:,.2f}"
            ),
        }
    )
    logger.info(
        "Checked product %s: price=%s target=%s dropped=%s email=%s",
        product.id,
        new_price,
        product.desired_price,
        price_dropped,
        email_sent,
    )
    return result
