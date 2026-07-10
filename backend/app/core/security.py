from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _safe_password(password: str) -> str:
    """bcrypt truncates at 72 bytes. Hash long passwords to fixed length."""
    import hashlib
    if len(password.encode('utf-8')) > 71:
        return hashlib.sha256(password.encode()).hexdigest()
    return password


def verify_password(plain_password, hashed_password):
    safe_plain = _safe_password(plain_password)
    return pwd_context.verify(safe_plain, hashed_password)


def get_password_hash(password):
    safe_plain = _safe_password(password)
    return pwd_context.hash(safe_plain)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": now
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": now
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def decode_token_safe(token: str):
    """Decode without verifying expiration (for logout/blacklist)"""
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
    except JWTError:
        return None
