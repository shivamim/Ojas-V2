import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import decrypt_field
from app.core.rbac import Permission, require_permission, get_current_user, CurrentUser
from app.models.patient import Patient
from app.models.whatsapp_log import WhatsAppMessageLog
from app.services.whatsapp import send_whatsapp_message

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/send-checkin/{patient_id}/{day}")
async def send_checkin(
    patient_id: str, 
    day: int, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_UPDATE))
):
    hospital_id = current_user.require_hospital()

    query = select(Patient).where(Patient.id == uuid.UUID(patient_id))
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))
    
    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    mobile = decrypt_field(p.mobile)
    name = decrypt_field(p.full_name)

    message = (
        f"Day {day} Check-in: Hi {name}, how are you feeling today? "
        "Please reply with your pain level (0-4) and if you have fever, swelling, or bleeding."
    )

    log = WhatsAppMessageLog(
        patient_id=p.id,
        message_type=f"day_{day}_checkin",
        status="SENT"
    )
    db.add(log)
    await db.commit()

    try:
        resp = await send_whatsapp_message(mobile, message)
    except Exception as e:
        print(f"WhatsApp send failed: {e}")
        resp = {"error": str(e), "status": "failed"}

    return {"message": "Check-in sent", "whatsapp_response": resp}


@router.get("/status/{patient_id}")
async def get_whatsapp_status(
    patient_id: str, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ))
):
    hospital_id = current_user.require_hospital()

    if hospital_id:
        patient_check = await db.execute(
            select(Patient).where(
                Patient.id == uuid.UUID(patient_id),
                Patient.hospital_id == uuid.UUID(hospital_id)
            )
        )
        if not patient_check.scalar_one_or_none():
            raise HTTPException(403, "Not authorized to view this patient")

    result = await db.execute(
        select(WhatsAppMessageLog)
        .where(WhatsAppMessageLog.patient_id == uuid.UUID(patient_id))
        .order_by(WhatsAppMessageLog.sent_at.desc())
    )
    logs = result.scalars().all()

    return [{
        "id": str(l.id),
        "message_type": l.message_type,
        "status": l.status,
        "sent_at": l.sent_at.isoformat() if l.sent_at else None,
        "delivered_at": l.delivered_at.isoformat() if l.delivered_at else None
    } for l in logs]
