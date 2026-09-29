"""Database engine, session factory and FastAPI dependency."""

from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

DATABASE_URL = settings.DATABASE_URL or "sqlite:///./smartprice.db"

# Render / Heroku style URLs use `postgres://`, SQLAlchemy requires `postgresql://`.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Ensure consistent path regardless of whether app is run from backend/ or repo root.
    if DATABASE_URL.startswith("sqlite:///./") or DATABASE_URL == "sqlite:///smartprice.db":
        base_dir = Path(__file__).resolve().parent.parent.parent
        db_path = (base_dir / "smartprice.db").resolve()
        DATABASE_URL = f"sqlite:///{db_path}"
    # Required for SQLite when used with FastAPI's threaded workers.
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Create tables and apply incremental SQLite migrations."""
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                info = conn.execute(text("PRAGMA table_info(products)")).fetchall()
                cols = [col[1] for col in info]
                if cols and "original_price" not in cols:
                    conn.execute(text("ALTER TABLE products ADD COLUMN original_price FLOAT"))
                    conn.commit()
                if cols and "user_id" not in cols:
                    conn.execute(text("ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
                if cols and "is_demo" not in cols:
                    conn.execute(text("ALTER TABLE products ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT 0"))
                    conn.commit()
                # Ensure only official demo items are marked is_demo = 1
                conn.execute(text("UPDATE products SET is_demo = 1 WHERE email = 'demo@smartprice.dev'"))
                conn.execute(text("UPDATE products SET is_demo = 0 WHERE email != 'demo@smartprice.dev'"))
                conn.commit()
        except Exception:
            pass

    seed_demo_accounts()


def seed_demo_accounts():
    """Ensure standard demo testing accounts exist with known credentials."""
    try:
        from app.models.models import User
        from app.utils.security import hash_password

        with SessionLocal() as db:
            accounts = [
                ("demo@smartprice.dev", "Demo Reviewer", "Demo@123456"),
                ("tester@smartprice.dev", "Test User", "Test@123456"),
            ]
            for email, name, pwd in accounts:
                u = db.query(User).filter(User.email == email).first()
                if not u:
                    db.add(User(
                        email=email,
                        name=name,
                        hashed_password=hash_password(pwd),
                        is_active=True,
                    ))
                else:
                    u.hashed_password = hash_password(pwd)
            db.commit()
    except Exception:
        pass


def get_db():
    """Yield a SQLAlchemy session and ensure it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure tables and schema are initialized
init_db()


