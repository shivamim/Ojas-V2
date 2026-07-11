import os
import time
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from functools import wraps

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text, select
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.database import engine, Base, AsyncSessionLocal
from app.core.config import settings
from app.routers import auth, superadmin, hospitals, patients, escalations, reports, whatsapp, contact

import app.models
from app.routers.patients import grievance_router

limiter = Limiter(key_func=get_remote_address)
_IS_PROD = settings.ENVIRONMENT == "production"


async def _ensure_admin_exists(db):
    """Create a default superadmin if no users exist (production safety net)."""
    from app.models.user import User
    from app.core.security import get_password_hash
    
    result = await db.execute(select(User))
    if result.scalars().first():  # ← FIX: was scalar_one_or_none() — crashes with multiple users
        return  # Users already exist, do nothing
    
    admin = User(
        id=uuid.uuid4(),
        email="admin@ojas.care",
        hashed_password=get_password_hash("admin123"),
        full_name="System Superadmin",
        role="SUPER_ADMIN",
        hospital_id=None,
        is_active=True
    )
    db.add(admin)
    await db.commit()
    logging.info("✅ Default admin created: admin@ojas.care / admin123")


async def _seed_if_needed():
    """Run seed data in background after app startup - ONLY in non-production."""
    try:
        await asyncio.sleep(2)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        from seed_data import seed
        await seed()
    except Exception as e:
        logging.warning(f"Seed data error (background): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info(f"Starting Ojas V3 in {settings.ENVIRONMENT} mode")

    def check_tables(sync_conn):
        inspector = inspect(sync_conn)
        return inspector.get_table_names()

    tables = []
    try:
        async with engine.begin() as conn:
            tables = await conn.run_sync(check_tables)
    except SQLAlchemyError as e:
        logging.error(f"Database connection failed: {e}")
        tables = []

    tables_missing = 'users' not in tables

    if tables_missing:
        logging.info("Tables not found — creating schema...")
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                tables = await conn.run_sync(check_tables)
            logging.info("Database schema created successfully")
        except Exception as e:
            logging.error(f"Failed to create tables: {e}")
            tables = []

    if 'users' not in tables:
        logging.error("Database tables missing after creation attempt!")
        raise RuntimeError("DB initialization failed — manual intervention required")

    # Auto-create admin if no users exist (works in both dev and prod)
    async with AsyncSessionLocal() as db:
        await _ensure_admin_exists(db)

    if tables_missing and not _IS_PROD:
        logging.info("Seeding development database with initial data...")
        asyncio.create_task(_seed_if_needed())
    elif tables_missing and _IS_PROD:
        logging.info("Production database ready. Admin user ensured.")

    yield
    logging.info("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="Ojas V3 — Post-Discharge Recovery Monitoring",
    description="NABH-Compliant | AI-Powered | Multi-Tenant",
    version="3.0.0",
    docs_url="/docs" if not _IS_PROD else None,
    openapi_url="/openapi.json" if not _IS_PROD else None,
    lifespan=lifespan,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router)
app.include_router(superadmin.router)
app.include_router(hospitals.router)
app.include_router(patients.router)
app.include_router(escalations.router)
app.include_router(reports.router)
app.include_router(whatsapp.router)
app.include_router(contact.router)
app.include_router(grievance_router)


@app.get("/health")
async def health_check():
    db_healthy = False
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            db_healthy = True
    except Exception as e:
        logging.warning(f"Health check DB fail: {e}")
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "version": "3.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/admin/seed-demo-data")
async def seed_demo_data():
    """
    Manually trigger seed data creation for demo purposes.
    Only works if no patients exist (prevents duplicate data).
    """
    from app.models.patient import Patient
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Patient))
        if result.scalars().first():
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={"detail": "Demo data already exists. Database is not empty."}
            )
        
        try:
            from seed_data import seed
            await seed(db)
            return {
                "message": "✅ Demo data seeded successfully!",
                "data": {
                    "users": ["admin@ojas.care", "nurse@cityhospital.com", "dr.shikhar@cityhospital.com"],
                    "hospital": "City Hospital",
                    "patients": 32,
                    "checkins": "~448 records (14 days × 32 patients)",
                    "escalations": "Multiple (for demo)"
                }
            }
        except Exception as e:
            logging.error(f"Failed to seed demo data: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": f"Seeding failed: {str(e)}"}
            )
