import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, decode_token_safe
)
from app.core.config import settings
from app.core.rbac import CurrentUser, get_current_user
from app.core.audit import log_audit
from app.models.user import User
from app.models.hospital_invite import HospitalInvite
from app.models.refresh_token import RefreshToken
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class InviteAcceptRequest(BaseModel):
    token: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Apply rate limiting to prevent brute-force attacks
    try:
        limiter.limit("5/minute")(lambda: None)()
    except RateLimitExceeded:
        raise HTTPException(429, "Too many login attempts. Please try again later.")
    
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    if not user.is_active:
        raise HTTPException(403, "Account inactive or suspended")

    payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None
    }
    access = create_access_token(payload)
    refresh = create_refresh_token({"user_id": str(user.id), "jti": str(uuid.uuid4())})

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_naive = now_naive + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=get_password_hash(refresh),
        expires_at=expires_naive,
        created_at=now_naive
    )
    db.add(rt)
    await db.commit()

    await log_audit(
        db, str(user.id), str(user.hospital_id) if user.hospital_id else None,
        "LOGIN", "auth", str(user.id),
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
        True
    )
    await db.commit()

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "hospital_id": str(user.hospital_id) if user.hospital_id else None
        }
    }


@router.post("/refresh", response_model=dict)
async def refresh_token(req: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # Apply rate limiting to prevent token brute-force attacks
    try:
        limiter.limit("10/minute")(lambda: None)()
    except RateLimitExceeded:
        raise HTTPException(429, "Too many refresh attempts. Please try again later.")
    
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(401, "Malformed refresh token")

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(401, "Invalid user ID in token")

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

    token_result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == uid,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > now_naive
        )
    )
    stored_token = token_result.scalar_one_or_none()
    if not stored_token:
        raise HTTPException(401, "Refresh token revoked or expired")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")

    new_payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None
    }
    return {"access_token": create_access_token(new_payload)}


@router.post("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth.replace("Bearer ", "")
        payload = decode_token_safe(token)
        if payload:
            user_id = payload.get("user_id")
            if user_id:
                try:
                    uid = uuid.UUID(user_id)
                    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == uid))
                    await db.commit()
                except ValueError:
                    pass
    return {"message": "Logged out successfully"}


@router.post("/verify-invite")
async def verify_invite(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HospitalInvite).where(HospitalInvite.token == token))
    invite = result.scalar_one_or_none()
    if not invite or invite.used_at:
        raise HTTPException(400, "Invalid or used invite")
    if invite.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(400, "Invite expired")
    return {"valid": True, "email": invite.email, "role": invite.role}


@router.post("/accept-invite")
async def accept_invite(req: InviteAcceptRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HospitalInvite).where(HospitalInvite.token == req.token))
    invite = result.scalar_one_or_none()
    if not invite or invite.used_at:
        raise HTTPException(400, "Invalid or used invite")
    if invite.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(400, "Invite expired")

    existing = await db.execute(select(User).where(User.email == invite.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=invite.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=invite.role,
        hospital_id=invite.hospital_id,
        is_active=True
    )
    db.add(user)
    invite.used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(user)

    payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None
    }
    refresh = create_refresh_token({"user_id": str(user.id), "jti": str(uuid.uuid4())})

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_naive = now_naive + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    rt = RefreshToken(
        user_id=user.id,
        token_hash=get_password_hash(refresh),
        expires_at=expires_naive,
        created_at=now_naive
    )
    db.add(rt)
    await db.commit()

    return {
        "access_token": create_access_token(payload),
        "refresh_token": refresh,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "hospital_id": str(user.hospital_id) if user.hospital_id else None
        }
    }


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role,
        "hospital_id": current_user.hospital_id
    }
