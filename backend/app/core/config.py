import os
import sys
import secrets
import logging
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_IS_PROD = os.getenv("ENVIRONMENT", "development").lower() == "production"


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./ojas.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    ENCRYPTION_SALT: str = os.getenv("ENCRYPTION_SALT", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    WHATSAPP_API_KEY: str = os.getenv("WHATSAPP_API_KEY", "")
    WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "https://waba.360dialog.io/v1/messages")
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "")
    WHATSAPP_APP_SECRET: str = os.getenv("WHATSAPP_APP_SECRET", "")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "100/minute")
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "0"))
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    DPO_EMAIL: str = os.getenv("DPO_EMAIL", "dpo@ojas.care")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        if not self.SECRET_KEY:
            if _IS_PROD:
                logger.critical("FATAL: SECRET_KEY required in production")
                sys.exit(1)
            self.SECRET_KEY = secrets.token_urlsafe(32)
            logger.warning("Auto-generated SECRET_KEY (development only)")

        if not self.ENCRYPTION_KEY:
            if _IS_PROD:
                logger.critical("FATAL: ENCRYPTION_KEY required in production")
                sys.exit(1)
            self.ENCRYPTION_KEY = secrets.token_hex(16)
            logger.warning("Auto-generated ENCRYPTION_KEY (development only)")
        
        if not self.ENCRYPTION_SALT:
            if _IS_PROD:
                logger.critical("FATAL: ENCRYPTION_SALT required in production")
                sys.exit(1)
            self.ENCRYPTION_SALT = secrets.token_urlsafe(16)
            logger.warning("Auto-generated ENCRYPTION_SALT (development only)")

    @property
    def cors_origins(self) -> List[str]:
        origins = [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]
        if not _IS_PROD:
            origins.extend(["http://localhost:5173", "http://localhost:3000"])
        return list(set(origins))


settings = Settings()
