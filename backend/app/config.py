"""Application settings using pydantic-settings.

Loads configuration from environment variables and optional `.env` file.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_env = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Central application configuration."""

    DATABASE_URL: str = "sqlite:///./smartprice.db"

    # Resend API Configuration (Recommended: https://resend.com)
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "SmartPrice <onboarding@resend.dev>"

    # Brevo HTTP API (https://brevo.com - Sends to ANY recipient on Render Free tier without custom domain)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "SmartPrice Tracker"

    # SMTP Configuration (Alternative: Gmail, Brevo, Mailgun)
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""

    CHECK_INTERVAL_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:3000"

    # Authentication & JWT Configuration
    JWT_SECRET: str = "smartprice-super-secure-production-jwt-token-signing-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(
        env_file=str(_backend_env) if _backend_env.exists() else ".env",
        extra="ignore",
    )



@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
