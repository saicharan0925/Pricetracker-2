"""Background scheduler that periodically re-checks all tracked products."""

from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

scheduler: Optional[BackgroundScheduler] = None


def check_all_products() -> dict:
    """Scrape every tracked product and send drop alerts.

    Runs inside the scheduler thread with its own DB session.
    Never raises — errors are logged per product.
    """
    # Local imports avoid circular dependencies at module load time.
    from app.database.database import SessionLocal
    from app.models.models import Product
    from app.services.price_service import check_and_update_price

    db = SessionLocal()
    summary = {"checked": 0, "dropped": 0, "failed": 0}
    try:
        products = db.query(Product).all()
        logger.info("Scheduler checking %d product(s)", len(products))
        for product in products:
            try:
                result = check_and_update_price(db, product, send_email=True)
                summary["checked"] += 1
                if result.get("status") != "success":
                    summary["failed"] += 1
                elif result.get("price_dropped"):
                    summary["dropped"] += 1
            except Exception as exc:
                summary["failed"] += 1
                logger.error("Scheduler failed for product %s: %s", product.id, exc)
        logger.info("Scheduler run complete: %s", summary)
    except Exception as exc:
        logger.error("Scheduler run failed: %s", exc)
    finally:
        db.close()
    return summary


def start_scheduler(app=None) -> BackgroundScheduler:
    """Start the interval scheduler (idempotent). Stores handle on ``app.state``."""
    global scheduler
    if scheduler is not None and scheduler.running:
        return scheduler
    settings = get_settings()
    interval = max(int(settings.CHECK_INTERVAL_MINUTES or 30), 1)
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        check_all_products,
        trigger="interval",
        minutes=interval,
        id="check_all_products",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Price-check scheduler started (every %d minute(s))", interval)
    if app is not None:
        app.state.scheduler = scheduler
    return scheduler


def shutdown_scheduler() -> None:
    """Stop the scheduler gracefully (safe to call when not running)."""
    global scheduler
    try:
        if scheduler is not None and scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("Price-check scheduler stopped")
    except Exception as exc:
        logger.warning("Scheduler shutdown issue: %s", exc)
    finally:
        scheduler = None
