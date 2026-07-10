import os
import time
import uuid
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from functools import wraps

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.database import engine, Base, AsyncSessionLocal
from app.core.config import settings
from app.routers import auth, superadmin, hospitals, patients, escalations, reports, whatsapp

limiter = Limiter(key_func=get_remote_address)

_IS_PROD = settings.ENVIRONMENT == "production"


async def _seed_if_needed():
    """Run seed data in background after app startup."""
    try:
        await asyncio.sleep(2)
        async with AsyncSessionLocal() as seed_db:
            from seed_data import seed
            await seed(seed_db)
    except Exception as e:
        import logging
        logging.warning(f"Seed data error (background): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    logging.info(f"Starting Ojas V3 in {settings.ENVIRONMENT} mode")

    async with engine.begin() as conn:
        def check_tables(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()
        try:
            tables = await conn.run_sync(check_tables)
        except SQLAlchemyError as e:
            logging.error(f"Database connection failed: {e}")
            tables = []

    if 'users' not in tables:
        logging.info("Tables not found — creating...")
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logging.info("Tables created successfully")
        except Exception as e:
            logging.error(f"Failed to create tables: {e}")

    if 'users' not in tables:
        asyncio.create_task(_seed_if_needed())

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin",
                   "X-Requested-With", "X-Request-ID", "X-API-Key"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-API-Version"],
    max_age=86400,
)

# Compression middleware
try:
    from brotli_asgi import BrotliMiddleware
    app.add_middleware(BrotliMiddleware, minimum_size=1000, quality=4)
except ImportError:
    pass

app.add_middleware(GZipMiddleware, minimum_size=1000)


def cache_control(max_age=300):
    """Add Cache-Control headers to API responses."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            response = await func(*args, **kwargs)
            if isinstance(response, JSONResponse):
                response.headers["Cache-Control"] = f"public, max-age={max_age}"
            return response
        return wrapper
    return decorator


@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()

    response = await call_next(request)
    process_time = time.time() - start_time

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    response.headers["X-API-Version"] = "3.0.0"

    if process_time > 0.5:
        import logging
        logging.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s [{request_id}]")

    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # OWASP recommended security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    
    # Content Security Policy
    if _IS_PROD:
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self' https://waba.360dialog.io; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        response.headers["X-Content-Security-Policy"] = csp
    
    return response


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    import logging
    req_id = getattr(request.state, "request_id", None)
    logging.error(f"Database error [{req_id}]: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error occurred", "request_id": req_id}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    import logging
    req_id = getattr(request.state, "request_id", None)
    logging.error(f"Unhandled error [{req_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "request_id": req_id}
    )


# Register all routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(superadmin.router, prefix="/api/v1")
app.include_router(hospitals.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(escalations.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")


@app.api_route("/", methods=["GET", "HEAD"])
@cache_control(max_age=60)
async def root():
    return {
        "name": "Ojas V3 API",
        "version": "3.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if not _IS_PROD else None
    }


@app.get("/health")
@cache_control(max_age=10)
async def health():
    db_healthy = False
    last_error = None

    for attempt in range(3):
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                db_healthy = result.scalar() == 1
                break
        except Exception as e:
            last_error = str(e)
            if attempt < 2:
                await asyncio.sleep(0.5)

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
