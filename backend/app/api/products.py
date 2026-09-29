"""Product tracking REST API."""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import PriceHistory, Product, User
from app.schemas.schemas import (
    CheckPriceResponse,
    MessageResponse,
    PriceHistoryResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StatsResponse,
)
from app.services import email_service, price_service
from app.services.scraper import scrape_product
from app.utils import validators
from app.utils.limiter import limiter
from app.utils.logger import get_logger
from app.utils.security import get_optional_user


logger = get_logger(__name__)

router = APIRouter(tags=["products"])


def get_product_or_404(db: Session, product_id: int) -> Product:
    """Fetch a product or raise 404."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def sanitize_product_response(product: Optional[Product], current_user: Optional[User]) -> Optional[ProductResponse]:
    """Sanitize product response to ensure emails are never leaked to public or other users."""
    if product is None:
        return None
    resp = ProductResponse.model_validate(product)
    # Never expose email to public visitors or non-owners
    if not current_user:
        resp.email = None
    elif product.user_id and product.user_id != current_user.id and product.email != current_user.email:
        resp.email = None
    return resp


# ---------------------------------------------------------------------------
# Create / list
# ---------------------------------------------------------------------------


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_product(
    request: Request,
    payload: ProductCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Track a new product. Requires authenticated user to ensure private scoping."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in or create an account to start tracking products privately.",
        )

    raw_url = str(payload.url)
    if not validators.is_valid_url(raw_url):
        raise HTTPException(status_code=400, detail="Invalid product URL")
    url = validators.normalize_url(raw_url)

    current_price: Optional[float] = payload.current_price
    original_price: Optional[float] = payload.original_price
    image_url: Optional[str] = payload.image_url
    product_name: str = payload.name.strip()

    try:
        scraped = scrape_product(url)
        if scraped.get("current_price") is not None and current_price is None:
            current_price = float(scraped["current_price"])
        if scraped.get("original_price") is not None and original_price is None:
            original_price = float(scraped["original_price"])
        if scraped.get("image_url") and not image_url:
            image_url = scraped["image_url"]
        # Use scraped name if user gave a very short placeholder
        if scraped.get("product_name") and len(product_name) <= 3:
            product_name = scraped["product_name"]
    except Exception as exc:  # best-effort — never block creation
        logger.warning("Initial scrape failed for %s: %s", url, exc)

    alert_email = str(payload.email).strip() if payload.email else current_user.email
    if not alert_email:
        raise HTTPException(status_code=400, detail="Recipient email is required for tracking alerts")

    product = Product(
        user_id=current_user.id,
        name=product_name,
        url=url,
        current_price=current_price,
        desired_price=float(payload.desired_price),
        original_price=original_price,
        email=alert_email,
        image_url=image_url,
        is_demo=False,
        last_checked=datetime.now(timezone.utc) if current_price is not None else None,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    if current_price is not None:
        try:
            db.add(PriceHistory(product_id=product.id, price=current_price))
            db.commit()
            db.refresh(product)
        except Exception as exc:
            db.rollback()
            logger.warning("Failed to store initial price history: %s", exc)

    # Send tracking confirmation email
    try:
        email_service.send_verification_email(
            to_email=product.email,
            product_name=product.name,
            desired_price=product.desired_price,
            current_price=product.current_price,
            product_url=product.url,
        )
        if current_price is not None and current_price <= product.desired_price:
            email_service.send_price_drop_email(
                to_email=product.email,
                product_name=product.name,
                current_price=current_price,
                desired_price=product.desired_price,
                product_url=product.url,
            )
    except Exception as exc:
        logger.warning("Tracking confirmation email could not be sent: %s", exc)

    logger.info("Tracked new product id=%s url=%s price=%s email=%s", product.id, url, current_price, product.email)
    return sanitize_product_response(product, current_user)




@router.get("/products", response_model=list[ProductResponse])
def list_products(
    q: Optional[str] = Query(default=None, description="Search in name or URL"),
    sort_by: Literal["price", "name", "created"] = Query(default="created"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    site: Optional[str] = Query(default=None, description="Filter by site: amazon/flipkart/myntra/other"),
    limit: int = Query(default=100, ge=0, le=1000, description="Max rows (0 = all)"),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List tracked products. Logged-in users see only their private items; visitors see only curated demo items."""
    query = db.query(Product)
    if current_user:
        query = query.filter(
            (Product.user_id == current_user.id) | (Product.email == current_user.email),
            Product.is_demo.is_(False),
        )
    else:
        # Public visitor mode: ONLY return official demo items
        query = query.filter(Product.is_demo.is_(True))

    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Product.name.ilike(like)) | (Product.url.ilike(like)))

    if site:
        s = site.strip().lower()
        if s in ("amazon", "flipkart", "myntra"):
            query = query.filter(Product.url.ilike(f"%{s}%"))
        elif s == "other":
            query = query.filter(
                ~Product.url.ilike("%amazon%"),
                ~Product.url.ilike("%flipkart%"),
                ~Product.url.ilike("%myntra%"),
            )

    sort_col = {
        "price": Product.current_price,
        "name": Product.name,
        "created": Product.created_at,
    }.get(sort_by, Product.created_at)
    query = query.order_by(sort_col.asc() if order == "asc" else sort_col.desc())

    if offset:
        query = query.offset(offset)
    if limit != 0:  # limit=0 means "all"
        query = query.limit(limit)

    products = query.all()
    return [sanitize_product_response(p, current_user) for p in products]


# ---------------------------------------------------------------------------
# Stats (defined before /products/{id} to avoid route conflicts if nested)
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=StatsResponse)
def get_stats(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Aggregate dashboard statistics scoped strictly to current user or public demo."""
    base_query = db.query(Product)
    if current_user:
        base_query = base_query.filter(
            (Product.user_id == current_user.id) | (Product.email == current_user.email),
            Product.is_demo.is_(False),
        )
    else:
        base_query = base_query.filter(Product.is_demo.is_(True))

    total_products = base_query.count()
    avg_price = (
        base_query.filter(Product.current_price.isnot(None))
        .with_entities(func.avg(Product.current_price))
        .scalar()
    )
    lowest = (
        base_query.filter(Product.current_price.isnot(None))
        .order_by(Product.current_price.asc())
        .first()
    )
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_drops = (
        base_query.filter(
            Product.current_price.isnot(None),
            Product.current_price <= Product.desired_price,
            Product.last_checked.isnot(None),
            Product.last_checked >= week_ago,
        )
        .order_by(Product.last_checked.desc())
        .all()
    )
    total_alerts = (
        base_query.filter(
            Product.current_price.isnot(None), Product.current_price <= Product.desired_price
        ).count()
    )

    lowest_sanitized = sanitize_product_response(lowest, current_user) if lowest else None
    drops_sanitized = [sanitize_product_response(p, current_user) for p in recent_drops]

    return StatsResponse(
        total_products=total_products,
        avg_price=round(float(avg_price), 2) if avg_price is not None else None,
        lowest_price_product=lowest_sanitized,
        recent_drops_count=len(drops_sanitized),
        recent_drops=drops_sanitized,
        total_alerts_sent=int(total_alerts),
    )


# ---------------------------------------------------------------------------
# Single-product CRUD
# ---------------------------------------------------------------------------


@router.get("/products/export/csv")
def export_products_csv(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Export tracked products as CSV. Scoped strictly to the authenticated user."""
    import csv
    import io

    from fastapi.responses import StreamingResponse

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to export your tracked products.",
        )

    products = (
        db.query(Product)
        .filter(
            (Product.user_id == current_user.id) | (Product.email == current_user.email),
            Product.is_demo.is_(False),
        )
        .order_by(Product.created_at.desc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "name", "url", "current_price", "desired_price", "email", "last_checked", "created_at"])
    for p in products:
        writer.writerow([p.id, p.name, p.url, p.current_price, p.desired_price, p.email, p.last_checked, p.created_at])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartprice-export.csv"},
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Fetch a single tracked product with privacy protection."""
    product = get_product_or_404(db, product_id)
    if not product.is_demo:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please sign in to view this private product.",
            )
        if product.user_id != current_user.id and product.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this product.",
            )
    return sanitize_product_response(product, current_user)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Partially update a tracked product."""
    product = get_product_or_404(db, product_id)
    if product.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo showcase products cannot be modified. Create an account to track your own items.",
        )
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to edit products.")
    if product.user_id and product.user_id != current_user.id and product.email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this product.")

    data = payload.model_dump(exclude_unset=True)

    if "url" in data and data["url"] is not None:
        raw_url = str(data["url"])
        if not validators.is_valid_url(raw_url):
            raise HTTPException(status_code=400, detail="Invalid product URL")
        product.url = validators.normalize_url(raw_url)
    if "name" in data and data["name"] is not None:
        product.name = data["name"].strip()
    if "desired_price" in data and data["desired_price"] is not None:
        product.desired_price = float(data["desired_price"])
    if "original_price" in data:
        product.original_price = float(data["original_price"]) if data["original_price"] is not None else None
    if "email" in data and data["email"] is not None:
        product.email = str(data["email"])
    if "image_url" in data:
        product.image_url = data["image_url"]

    now = datetime.now(timezone.utc)
    if "current_price" in data and data["current_price"] is not None:
        new_price = float(data["current_price"])
        product.current_price = new_price
        product.last_checked = now
        # Record updated price into price history
        db.add(PriceHistory(product_id=product.id, price=new_price, checked_at=now))

    product.updated_at = now
    db.commit()
    db.refresh(product)
    return sanitize_product_response(product, current_user)


@router.post("/products/check-all")
def check_all_now(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Trigger an immediate price check on scoped products."""
    query = db.query(Product)
    if current_user:
        query = query.filter(
            (Product.user_id == current_user.id) | (Product.email == current_user.email),
            Product.is_demo.is_(False),
        )
    else:
        query = query.filter(Product.is_demo.is_(True))

    products = query.all()
    results = []
    for p in products:
        try:
            res = price_service.check_and_update_price(db, p, send_email=bool(current_user))
            results.append({"id": p.id, "name": p.name, "result": res})
        except Exception as exc:
            results.append({"id": p.id, "name": p.name, "error": str(exc)})
    return {"total": len(products), "checked": len(results), "items": results}


@router.post("/products/seed-demo")
def seed_demo_products(db: Session = Depends(get_db)):
    """Seed sample products with rich price histories for demonstration."""
    demo_items = [
        {
            "name": "Sony WH-1000XM5 Wireless Active Noise Cancelling Headphones",
            "url": "https://www.amazon.in/Sony-WH-1000XM5-Wireless-Noise-Cancelling-Headphones/dp/B09XS7JWHH",
            "current_price": 29819.0,
            "desired_price": 31000.0,
            "original_price": 34990.0,
            "email": "demo@smartprice.dev",
            "image_url": "https://m.media-amazon.com/images/I/31fEv99XZ+L._SX300_SY300_QL70_FMwebp_.jpg",
            "history": [34990.0, 33500.0, 32990.0, 31490.0, 29819.0],
        },
        {
            "name": "Apple iPhone 15 (Black, 128 GB)",
            "url": "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4",
            "current_price": 64999.0,
            "desired_price": 65000.0,
            "original_price": 79900.0,
            "email": "demo@smartprice.dev",
            "image_url": "https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg",
            "history": [79900.0, 74999.0, 71999.0, 69999.0, 64999.0],
        },
        {
            "name": "Apple MacBook Air M2 Chip (13.6-inch, 8GB RAM, 256GB SSD)",
            "url": "https://www.amazon.in/Apple-MacBook-Air-Laptop-M2/dp/B0B3CQ6Q7Y",
            "current_price": 89990.0,
            "desired_price": 85000.0,
            "original_price": 99900.0,
            "email": "demo@smartprice.dev",
            "image_url": "https://m.media-amazon.com/images/I/71f5Eu5lJSL._SX679_.jpg",
            "history": [99900.0, 96900.0, 94990.0, 92490.0, 89990.0],
        },
        {
            "name": "Kindle Paperwhite (16 GB) – 6.8\" display, adjustable warm light",
            "url": "https://www.amazon.in/Kindle-Paperwhite-16-GB/dp/B08N3TCP2F",
            "current_price": 13999.0,
            "desired_price": 12500.0,
            "original_price": 14999.0,
            "email": "demo@smartprice.dev",
            "image_url": "https://m.media-amazon.com/images/I/61r5tY7QkUL._SX679_.jpg",
            "history": [14999.0, 14499.0, 13999.0],
        },
    ]

    created = 0
    now = datetime.now(timezone.utc)
    for item in demo_items:
        exists = db.query(Product).filter(Product.url == item["url"]).first()
        if exists:
            continue
        p = Product(
            name=item["name"],
            url=item["url"],
            current_price=item["current_price"],
            desired_price=item["desired_price"],
            original_price=item.get("original_price"),
            email=item["email"],
            image_url=item.get("image_url"),
            is_demo=True,
            last_checked=now,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        created += 1

        history_prices = item.get("history", [item["current_price"]])
        for i, price in enumerate(history_prices):
            past_time = now - timedelta(days=len(history_prices) - 1 - i, hours=i * 2)
            db.add(PriceHistory(product_id=p.id, price=price, checked_at=past_time))
        db.commit()

    return {"message": f"Successfully seeded {created} demo products with price histories."}


@router.delete("/products/{product_id}", response_model=MessageResponse)
def delete_product(
    product_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Stop tracking (delete) a product and its history (cascade)."""
    product = get_product_or_404(db, product_id)
    if product.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo showcase products cannot be deleted. Create a free account to manage your own items.",
        )
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to delete products.")
    if product.user_id and product.user_id != current_user.id and product.email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this product.")

    db.delete(product)
    db.commit()
    logger.info("Deleted product id=%s", product_id)
    return MessageResponse(message="Product deleted successfully")


# ---------------------------------------------------------------------------
# Price checks & history
# ---------------------------------------------------------------------------


def _check_product_read_access(product: Product, current_user: Optional[User]):
    if not product.is_demo:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please sign in to view this private product.",
            )
        if product.user_id != current_user.id and product.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this product.",
            )


@router.post("/check-price/{product_id}", response_model=CheckPriceResponse)
def check_price_now(
    product_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Run an on-demand price check for a product."""
    product = get_product_or_404(db, product_id)
    if not product.is_demo:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to check prices.")
        if product.user_id != current_user.id and product.email != current_user.email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to check this product.")

    result = price_service.check_and_update_price(db, product, send_email=bool(current_user))
    return CheckPriceResponse(
        product_id=product.id,
        product_name=product.name,
        current_price=result.get("current_price"),
        desired_price=product.desired_price,
        price_dropped=bool(result.get("price_dropped")),
        email_sent=bool(result.get("email_sent")),
        last_checked=result.get("last_checked"),
        status=result.get("status", "success"),
        message=result.get("message", ""),
    )


@router.get("/price-history/{product_id}", response_model=list[PriceHistoryResponse])
def get_price_history(
    product_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Return recent price-history entries for a product (newest first)."""
    product = get_product_or_404(db, product_id)
    _check_product_read_access(product, current_user)
    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.checked_at.desc())
        .limit(limit)
        .all()
    )
    return rows


# ---------------------------------------------------------------------------
# Compatibility aliases (frontend uses nested routes)
# ---------------------------------------------------------------------------


@router.post("/products/{product_id}/check", response_model=CheckPriceResponse)
def check_price_nested(
    product_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Alias of POST /check-price/{id} for frontend compatibility."""
    return check_price_now(product_id, current_user, db)


@router.get("/products/{product_id}/history", response_model=list[PriceHistoryResponse])
def get_price_history_nested(
    product_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Alias of GET /price-history/{id} for frontend compatibility."""
    return get_price_history(product_id, limit, current_user, db)


from pydantic import BaseModel


class TestEmailRequest(BaseModel):
    to_email: Optional[str] = None


@router.get("/email/status")
def get_email_status():
    """Check whether SMTP email sending is configured."""
    return email_service.get_smtp_status()


@router.post("/email/test")
@limiter.limit("5/minute")
def send_diagnostic_email(
    request: Request,
    body: Optional[TestEmailRequest] = None,
    to_email: Optional[str] = Query(default=None, description="Recipient email address"),
):
    """Send a diagnostic test email to verify SMTP or Resend delivery."""
    target = (body.to_email if body and body.to_email else to_email) or ""
    clean_email = target.strip()
    if "@" not in clean_email or "." not in clean_email:
        raise HTTPException(status_code=400, detail="Invalid recipient email address")
    return email_service.send_test_email(clean_email)

