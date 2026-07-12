import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import encrypt_field, decrypt_field
from app.core.rbac import require_permission, Permission, get_current_user, CurrentUser
from app.models.hospital import Hospital

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=100)
    bed_count: Optional[int] = Field(None, ge=0, le=5000)
    nabh_level: Optional[str] = Field(None, min_length=1, max_length=50)
    logo_url: Optional[str] = Field(None, max_length=500)
    settings: Optional[dict] = None


@router.get("/me")
async def get_my_hospital(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    hospital_id = require_tenant(request)
    
    if current_user.is_superadmin():
        result = await db.execute(select(Hospital).where(Hospital.is_active == True).limit(1))
        h = result.scalar_one_or_none()
        if not h:
            raise HTTPException(404, "No hospital found")
    else:
        if not hospital_id:
            raise HTTPException(403, "Hospital context required")
        result = await db.execute(select(Hospital).where(Hospital.id == uuid.UUID(hospital_id)))
        h = result.scalar_one_or_none()
        if not h:
            raise HTTPException(404, "Hospital not found")

    return {
        "id": str(h.id),
        "name": h.name,
        "city": h.city,
        "state": h.state,
        "bed_count": h.bed_count,
        "nabh_level": h.nabh_level,
        "contact_email": decrypt_field(h.contact_email),
        "contact_phone": decrypt_field(h.contact_phone),
        "logo_url": h.logo_url,
        "settings": h.settings or {},
        "plan_type": h.plan_type,
        "is_active": h.is_active
    }


@router.put("/me")
async def update_my_hospital(
    req: HospitalUpdate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_MANAGE))
):
    hospital_id = require_tenant(request)
    
    if current_user.is_superadmin():
        raise HTTPException(403, "Super Admin must use /superadmin/hospitals endpoint")
    
    if not hospital_id:
        raise HTTPException(403, "Hospital context required")
    
    result = await db.execute(select(Hospital).where(Hospital.id == uuid.UUID(hospital_id)))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(404, "Hospital not found")

    if req.name is not None: h.name = req.name
    if req.city is not None: h.city = req.city
    if req.state is not None: h.state = req.state
    if req.bed_count is not None: h.bed_count = req.bed_count
    if req.nabh_level is not None: h.nabh_level = req.nabh_level
    if req.logo_url is not None: h.logo_url = req.logo_url
    if req.settings is not None: h.settings = req.settings

    await db.commit()
    await db.refresh(h)
    
    return {
        "id": str(h.id),
        "name": h.name,
        "city": h.city,
        "state": h.state,
        "bed_count": h.bed_count,
        "nabh_level": h.nabh_level,
        "message": "Hospital updated successfully"
    }
