import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

_IS_PROD = os.getenv("ENVIRONMENT", "development").lower() == "production"
use_null_pool = os.getenv("DATABASE_USE_NULLPOOL", "false").lower() == "true"

# Supabase requires SSL in production
connect_args = {}
if _IS_PROD and "supabase" in settings.DATABASE_URL.lower():
    connect_args["ssl"] = "require"

# SQLite doesn't support pool_size/max_overflow - only use for PostgreSQL
is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

if is_sqlite or use_null_pool:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        poolclass=NullPool if is_sqlite else None,
        pool_pre_ping=not is_sqlite,
        connect_args=connect_args,
    )
else:
    # FIX: Enhanced pool configuration for production workloads
    # - pool_pre_ping=True: Detects and recycles stale connections
    # - pool_recycle=1800: Recycle connections every 30 min (was 5 min)
    # - pool_size=10: Base connections (synced with render.yaml)
    # - max_overflow=20: Burst capacity (synced with render.yaml)
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        connect_args=connect_args,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
