import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import decrypt_field
from app.core.rbac import Permission, require_permission, get_current_user, CurrentUser
from app.models.escalation import Escalation
from app.models.patient import Patient
from app.models.timeline import TimelineEvent
from app.services.coach_suggestions import get_suggestions

router = APIRouter(prefix="/escalations", tags=["Escalations"])


class ResolveRequest(BaseModel):
    resolution_note: str = Field(..., min_length=1, max_length=1000)


@router.get("")
async def list_escalations(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ)),
    status: str = "OPEN",
    limit: int = 50,
    offset: int = 0
):
    hospital_id = current_user.require_hospital()

    query = select(Escalation).options(selectinload(Escalation.patient)).join(Patient)
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))
    if status:
        query = query.where(Escalation.status == status)

    # Add pagination
    query = query.order_by(Escalation.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    escalations = result.scalars().all()
    
    # Get total count for pagination
    count_query = select(func.count()).select_from(Escalation).join(Patient)
    if hospital_id:
        count_query = count_query.where(Patient.hospital_id == uuid.UUID(hospital_id))
    if status:
        count_query = count_query.where(Escalation.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    data = []
    for e in escalations:
        p = e.patient
        data.append({
            "id": str(e.id),
            "patient_id": str(e.patient_id),
            "patient_name": decrypt_field(p.full_name) if p else "Unknown",
            "level": e.level,
            "status": e.status,
            "trigger_type": e.trigger_type,
            "trigger_detail": e.trigger_detail,
            "description": e.description,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "suggestions": get_suggestions(e.trigger_type, decrypt_field(p.doctor_name) if p else "Doctor")
        })
    
    return {"data": data, "total": total, "limit": limit, "offset": offset}


@router.post("/{escalation_id}/resolve")
async def resolve_escalation(
    escalation_id: str, 
    req: ResolveRequest, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_UPDATE))
):
    hospital_id = current_user.require_hospital()

    result = await db.execute(
        select(Escalation).where(Escalation.id == uuid.UUID(escalation_id))
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Escalation not found")

    p_result = await db.execute(
        select(Patient).where(Patient.id == e.patient_id)
    )
    p = p_result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found for this escalation")
    
    if hospital_id and str(p.hospital_id) != hospital_id:
        raise HTTPException(403, "Not authorized to resolve this escalation")

    e.status = "RESOLVED"
    e.resolution_note = req.resolution_note
    e.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    e.resolved_by = uuid.UUID(current_user.user_id)

    open_count_result = await db.execute(
        select(Escalation).where(
            Escalation.patient_id == e.patient_id,
            Escalation.status == "OPEN"
        )
    )
    open_escalations = open_count_result.scalars().all()
    if len(open_escalations) == 0:
        p.status = "ACTIVE"

    event = TimelineEvent(
        patient_id=e.patient_id,
        event_type="HUMAN_ACTION",
        title="Escalation Resolved",
        description=req.resolution_note,
        day_number=p.current_day
    )
    db.add(event)

    await db.commit()
    return {"message": "Escalation resolved", "patient_status": p.status}
