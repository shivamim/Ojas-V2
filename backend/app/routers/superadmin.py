import uuid
import secrets
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone, timedelta

from app.core.database import get_db, engine, Base
from app.core.rbac import require_superadmin, get_current_user, CurrentUser
from app.core.encryption import encrypt_field
from app.models.hospital import Hospital
from app.models.user import User
from app.models.hospital_invite import HospitalInvite
from app.models.patient import Patient
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/superadmin", tags=["SuperAdmin"])


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    bed_count: int = Field(100, ge=1)
    nabh_level: str = "Entry Level"
    contact_email: EmailStr
    contact_phone: str = Field(..., min_length=5)


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "HOSPITAL_ADMIN"


@router.post("/hospitals")
async def create_hospital(
    req: HospitalCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin)
):
    hospital = Hospital(
        name=req.name.strip(),
        city=req.city.strip(),
        state=req.state.strip(),
        bed_count=req.bed_count,
        nabh_level=req.nabh_level,
        contact_email=encrypt_field(req.contact_email),
        contact_phone=encrypt_field(req.contact_phone)
    )
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return {"id": str(hospital.id), "name": hospital.name, "message": "Hospital created"}


@router.get("/hospitals")
async def list_hospitals(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin)
):
    result = await db.execute(select(Hospital).where(Hospital.is_active == True))
    hospitals = result.scalars().all()

    data = []
    for h in hospitals:
        patient_count = await db.execute(
            select(func.count()).select_from(Patient).where(Patient.hospital_id == h.id)
        )
        data.append({
            "id": str(h.id),
            "name": h.name,
            "city": h.city,
            "state": h.state,
            "bed_count": h.bed_count,
            "nabh_level": h.nabh_level,
            "plan_type": h.plan_type,
            "patient_count": patient_count.scalar(),
            "created_at": h.created_at.isoformat() if h.created_at else None
        })
    return data


@router.get("/hospitals/{hospital_id}")
async def get_hospital(
    hospital_id: str, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin)
):
    result = await db.execute(select(Hospital).where(Hospital.id == uuid.UUID(hospital_id)))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(404, "Hospital not found")

    patient_count = await db.execute(
        select(func.count()).select_from(Patient).where(Patient.hospital_id == h.id)
    )
    user_count = await db.execute(
        select(func.count()).select_from(User).where(User.hospital_id == h.id)
    )

    return {
        "id": str(h.id),
        "name": h.name,
        "city": h.city,
        "state": h.state,
        "bed_count": h.bed_count,
        "nabh_level": h.nabh_level,
        "patient_count": patient_count.scalar(),
        "user_count": user_count.scalar(),
        "settings": h.settings or {}
    }


@router.post("/hospitals/{hospital_id}/invite")
async def invite_user(
    hospital_id: str, 
    req: InviteCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin)
):
    h_result = await db.execute(select(Hospital).where(Hospital.id == uuid.UUID(hospital_id)))
    if not h_result.scalar_one_or_none():
        raise HTTPException(404, "Hospital not found")
    
    token = secrets.token_urlsafe(32)
    invite = HospitalInvite(
        hospital_id=uuid.UUID(hospital_id),
        email=req.email,
        role=req.role,
        token=token,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=48),
        created_by=uuid.UUID(current_user.user_id)
    )
    db.add(invite)
    await db.commit()

    # Build invite link using FRONTEND_URL from settings
    invite_link = f"{settings.FRONTEND_URL}/accept-invite?token={token}"
    
    # Send email notification
    from app.services.email import send_invite_email
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == uuid.UUID(hospital_id)))
    hospital = hospital_result.scalar_one_or_none()
    hospital_name = hospital.name if hospital else "Ojas Hospital"
    
    await send_invite_email(req.email, invite_link, hospital_name)

    return {
        "message": "Invite created",
        "token": token,
        "link": invite_link
    }


@router.get("/audit-logs")
async def get_audit_logs(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
    limit: int = 100
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [{
        "id": str(l.id),
        "user_id": str(l.user_id) if l.user_id else None,
        "hospital_id": str(l.hospital_id) if l.hospital_id else None,
        "action": l.action,
        "resource": l.resource,
        "ip_address": l.ip_address,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        "success": l.success
    } for l in logs]


# REMOVED: /reset-database endpoint for production safety
# This endpoint was dangerous as it could drop all tables via HTTP request.
# For local development, use the standalone script: python scripts/reset_local_db.py
