"""FastAPI application entrypoint for SmartPrice Tracker."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.config import get_settings
from app.database.database import Base, engine, init_db
from app.utils.limiter import limiter
from app.utils.logger import get_logger

# Import models so SQLAlchemy registers tables before create_all().
import app.models.models  # noqa: F401

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and start/stop the background price-check scheduler."""
    logger.info("Initializing database tables and schema (if needed)")
    init_db()

    from app.scheduler.scheduler import shutdown_scheduler, start_scheduler

    start_scheduler(app)
    yield
    shutdown_scheduler()
    logger.info("Shutdown complete")


app = FastAPI(title="SmartPrice Tracker", version="1.0.0", lifespan=lifespan)

# --- Rate limiting ---------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# --- CORS ------------------------------------------------------------------
_frontend_raw = (settings.FRONTEND_URL or "").strip()
allow_origins = []
if _frontend_raw and _frontend_raw != "*":
    for origin in _frontend_raw.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in allow_origins:
            allow_origins.append(cleaned)
    for extra in ("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"):
        if extra not in allow_origins:
            allow_origins.append(extra)
    allow_credentials = True
else:
    allow_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"^https://.*(\.vercel\.app|\.onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Routes ----------------------------------------------------------------
# Primary /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")

# Dual-mount root fallback (ensures client requests work seamlessly whether VITE_API_URL includes /api or not)
app.include_router(auth_router)
app.include_router(products_router)


@app.get("/", tags=["health"])
@limiter.limit("100/minute")
def root(request: Request):
    """Root health endpoint."""
    return {"status": "ok", "message": "SmartPrice Tracker API", "docs": "/docs"}


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
@limiter.limit("100/minute")
def api_health(request: Request):
    """API health check."""
    return {"status": "healthy", "service": "smartprice-tracker"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all handler so unexpected errors return JSON instead of crashing."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
