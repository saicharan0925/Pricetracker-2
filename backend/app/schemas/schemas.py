"""Pydantic v2 schemas for request validation and API responses."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, computed_field


class ProductCreate(BaseModel):
    """Payload for tracking a new product."""

    name: str = Field(..., min_length=1, max_length=200)
    url: HttpUrl
    desired_price: float = Field(..., gt=0)
    email: EmailStr
    current_price: Optional[float] = Field(default=None, ge=0)
    original_price: Optional[float] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=2048)


class ProductUpdate(BaseModel):
    """Payload for partial product updates. All fields optional."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    url: Optional[HttpUrl] = None
    desired_price: Optional[float] = Field(default=None, gt=0)
    email: Optional[EmailStr] = None
    image_url: Optional[str] = Field(default=None, max_length=2048)
    current_price: Optional[float] = Field(default=None, ge=0)
    original_price: Optional[float] = Field(default=None, ge=0)


class UserCreate(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: Optional[str] = Field(default="", max_length=120)


class UserLogin(BaseModel):
    """Payload for user login."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """Safe user profile representation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: Optional[str] = ""
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    """JWT response payload."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProductResponse(BaseModel):
    """Full product representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    name: str
    url: str
    current_price: Optional[float] = None
    desired_price: float
    original_price: Optional[float] = None
    email: Optional[str] = None
    image_url: Optional[str] = None
    is_demo: bool = False
    last_checked: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @computed_field  # type: ignore[misc]
    @property
    def price_drop_pct(self) -> Optional[float]:
        """Percentage drop from desired_price or original_price to current_price.

        Positive means current price represents a discount or hit target.
        Returns None when current_price is unknown.
        """
        if self.current_price is None:
            return None
        if self.original_price and self.original_price > self.current_price:
            return round(((self.original_price - self.current_price) / self.original_price) * 100, 2)
        if self.desired_price > 0 and self.current_price <= self.desired_price:
            return round(((self.desired_price - self.current_price) / self.desired_price) * 100, 2)
        return None



class PriceHistoryResponse(BaseModel):
    """Single price-history entry."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    price: float
    checked_at: Optional[datetime] = None


class StatsResponse(BaseModel):
    """Aggregate dashboard statistics."""

    total_products: int
    avg_price: Optional[float] = None
    lowest_price_product: Optional[ProductResponse] = None
    recent_drops_count: int = 0
    recent_drops: list[ProductResponse] = Field(default_factory=list)
    total_alerts_sent: int = 0


class CheckPriceResponse(BaseModel):
    """Result of an on-demand price check."""

    product_id: int
    product_name: str
    current_price: Optional[float] = None
    desired_price: float
    price_dropped: bool = False
    email_sent: bool = False
    last_checked: Optional[datetime] = None
    status: str = "success"
    message: str = ""


class MessageResponse(BaseModel):
    """Generic message envelope (e.g. delete confirmation)."""

    message: str
