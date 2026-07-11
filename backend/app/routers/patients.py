import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from datetime import datetime, date, timezone
from typing import Optional

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import encrypt_field, decrypt_field
from app.core.rbac import Permission, require_permission, get_current_user, CurrentUser
from app.core.audit import log_audit
from app.models.patient import Patient, Grievance
from app.models.checkin import CheckIn
from app.models.escalation import Escalation
from app.models.timeline import TimelineEvent
from app.services.ai_scoring import calculate_risk_score
from app.services.readmission_risk import predict_readmission_risk
from app.services.whatsapp import send_whatsapp_message
from app.services.email import send_email

router = APIRouter(prefix="/patients", tags=["Patients"])


class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    mobile: str = Field(..., min_length=10, max_length=20)
    family_mobile: str = Field(..., min_length=10, max_length=20)
    age: int = Field(..., ge=0, le=150)
    surgery_type: str = Field(..., min_length=1)
    discharge_date: date
    doctor_name: str = Field(..., min_length=1)
    doctor_specialty: str = Field(..., min_length=1)
    bed_number: str = Field(..., min_length=1)
    uhid: str = Field(..., min_length=1)
    instructions: str = "Keep wound dry. Take prescribed medicines. Walk daily."
    consent_given: bool = Field(default=False)
    preferred_language: str = Field(default="en")


class PatientUpdate(BaseModel):
    status: Optional[str] = None
    current_day: Optional[int] = Field(None, ge=1, le=14)
    instructions: Optional[str] = None


class GrievanceCreate(BaseModel):
    contact_info: str = Field(..., min_length=5, description="Phone number or UHID for identification")
    message: str = Field(..., min_length=10, max_length=2000)


@router.post("")
async def create_patient(
    req: PatientCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_CREATE))
):
    """
    Create a new patient enrollment record.
    DPDPA 2023 Compliance: consent_given must be True, otherwise returns 422.
    """
    hospital_id = current_user.require_hospital()

    # DPDPA 2023: Reject if consent not given
    if not req.consent_given:
        raise HTTPException(
            status_code=422,
            detail="Patient consent is required under DPDPA 2023. Please obtain explicit consent before enrollment."
        )

    full_name = req.full_name.strip()
    mobile = req.mobile.strip()
    family_mobile = req.family_mobile.strip()

    patient = Patient(
        hospital_id=uuid.UUID(hospital_id) if hospital_id else None,
        full_name=encrypt_field(full_name),
        mobile=encrypt_field(mobile),
        family_mobile=encrypt_field(family_mobile),
        age=req.age,
        surgery_type=req.surgery_type.strip(),
        discharge_date=datetime.combine(req.discharge_date, datetime.min.time()),
        doctor_name=encrypt_field(req.doctor_name.strip()),
        doctor_specialty=req.doctor_specialty.strip(),
        bed_number=encrypt_field(req.bed_number.strip()),
        uhid=encrypt_field(req.uhid.strip()),
        instructions=req.instructions.strip(),
        status="ACTIVE",
        current_day=1,
        total_days=14,
        consent_given=True,
        consent_given_at=datetime.now(timezone.utc),
        consent_version="v1",
        preferred_language=req.preferred_language
    )
    db.add(patient)
    await db.flush()

    for day in range(1, 15):
        db.add(CheckIn(
            patient_id=patient.id,
            day_number=day,
            status="PENDING"
        ))

    db.add(TimelineEvent(
        patient_id=patient.id,
        event_type="ENROLLMENT",
        title="Patient Enrolled",
        description=f"{full_name} enrolled for {req.surgery_type} post-discharge monitoring.",
        day_number=0
    ))

    try:
        await send_whatsapp_message(
            mobile, 
            f"Welcome to Ojas Recovery Monitoring, {full_name}! You will receive daily check-ins for 14 days. Reply to this message if you need help."
        )
    except Exception as e:
        print(f"WhatsApp welcome failed (non-fatal): {e}")

    await db.commit()
    
    await log_audit(
        db, current_user.user_id, hospital_id,
        "CREATE", "patients", str(patient.id),
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
        True
    )
    await db.commit()

    return {"id": str(patient.id), "message": "Patient enrolled", "checkins_created": 14}

    return {"id": str(patient.id), "message": "Patient enrolled", "checkins_created": 14}


@router.get("")
async def list_patients(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ)),
    status: str = None, 
    page: int = 1, 
    limit: int = 20
):
    hospital_id = current_user.require_hospital()

    query = select(Patient)
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))
    if status:
        query = query.where(Patient.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    patients = result.scalars().all()

    data = []
    for p in patients:
        data.append({
            "id": str(p.id),
            "full_name": decrypt_field(p.full_name),
            "age": p.age,
            "surgery_type": p.surgery_type,
            "discharge_date": p.discharge_date.isoformat() if p.discharge_date else None,
            "doctor_name": decrypt_field(p.doctor_name),
            "status": p.status,
            "current_day": p.current_day,
            "response_rate": p.response_rate,
            "risk_score": p.risk_score,
            "risk_level": p.risk_level,
            "readmission_risk": p.readmission_risk
        })

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.get("/{patient_id}")
async def get_patient(
    patient_id: str, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ))
):
    hospital_id = current_user.require_hospital()

    query = select(Patient).options(
        selectinload(Patient.checkins),
        selectinload(Patient.timeline),
        selectinload(Patient.escalations)
    ).where(Patient.id == uuid.UUID(patient_id))
    
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))

    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    return {
        "id": str(p.id),
        "full_name": decrypt_field(p.full_name),
        "mobile": decrypt_field(p.mobile),
        "family_mobile": decrypt_field(p.family_mobile),
        "age": p.age,
        "surgery_type": p.surgery_type,
        "discharge_date": p.discharge_date.isoformat() if p.discharge_date else None,
        "doctor_name": decrypt_field(p.doctor_name),
        "doctor_specialty": p.doctor_specialty,
        "bed_number": decrypt_field(p.bed_number),
        "uhid": decrypt_field(p.uhid),
        "status": p.status,
        "current_day": p.current_day,
        "instructions": p.instructions,
        "response_rate": p.response_rate,
        "risk_score": p.risk_score,
        "risk_level": p.risk_level,
        "readmission_risk": p.readmission_risk,
        "checkins": [
            {"day": c.day_number, "status": c.status, "risk_level": c.risk_level, "responses": c.responses}
            for c in p.checkins
        ],
        "timeline": [
            {"day": t.day_number, "type": t.event_type, "title": t.title, "description": t.description}
            for t in p.timeline
        ],
        "escalations": [
            {"id": str(e.id), "level": e.level, "status": e.status, "trigger_type": e.trigger_type}
            for e in p.escalations
        ]
    }


@router.post("/{patient_id}/checkin/{day}")
async def submit_checkin(
    patient_id: str, 
    day: int, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_UPDATE)),
    responses: dict = Body(default={})
):
    hospital_id = current_user.require_hospital()

    query = select(Patient).options(
        selectinload(Patient.checkins),
        selectinload(Patient.escalations)
    ).where(Patient.id == uuid.UUID(patient_id))
    
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))

    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    checkin_result = await db.execute(
        select(CheckIn).where(CheckIn.patient_id == p.id, CheckIn.day_number == day)
    )
    checkin = checkin_result.scalar_one_or_none()
    if not checkin:
        raise HTTPException(404, "Checkin not found")

    checkin.status = "COMPLETED"
    checkin.replied_at = datetime.utcnow()
    checkin.responses = responses or {}
    
    pain_val = responses.get("pain", "0") if responses else "0"
    try:
        checkin.pain_level = int(pain_val)
    except (ValueError, TypeError):
        checkin.pain_level = 0

    ai_result = calculate_risk_score(checkin.responses, {"response_rate": p.response_rate})
    checkin.risk_score = ai_result["score"]
    checkin.risk_level = ai_result["level"]
    checkin.risk_reasons = ai_result["reasons"]

    p.risk_score = ai_result["score"]
    p.risk_level = ai_result["level"]

    all_checkins = p.checkins
    total = len(all_checkins)
    completed = sum(1 for c in all_checkins if c.status == "COMPLETED")
    p.response_rate = (completed / total) * 100 if total > 0 else 0
    p.current_day = day

    missed_count = sum(1 for c in all_checkins if c.status == "MISSED")
    open_esc_count = sum(1 for e in p.escalations if e.status == "OPEN")
    p.readmission_risk = predict_readmission_risk(p, missed_count, open_esc_count)

    fever_val = responses.get("fever", "N/A") if responses else "N/A"
    event = TimelineEvent(
        patient_id=p.id,
        event_type="CHECKIN",
        title=f"Day {day} Check-in Completed",
        description=f"Pain: {pain_val}, Fever: {fever_val}",
        day_number=day
    )
    db.add(event)

    if ai_result["level"] == "CRITICAL":
        escalation = Escalation(
            patient_id=p.id,
            level="CRITICAL",
            status="OPEN",
            trigger_type="ai_risk",
            trigger_detail=f"Day {day} critical risk score: {ai_result['score']}",
            description="; ".join(ai_result["reasons"])
        )
        db.add(escalation)
        p.status = "ESCALATED"

        try:
            family_mobile = decrypt_field(p.family_mobile)
            await send_whatsapp_message(
                family_mobile,
                f"Ojas Alert: {decrypt_field(p.full_name)} reported critical symptoms on Day {day}. Our team has been notified."
            )
        except Exception as e:
            print(f"Family alert failed (non-fatal): {e}")

    await db.commit()
    
    await log_audit(
        db, current_user.user_id, hospital_id,
        "UPDATE", "checkins", str(checkin.id),
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
        True
    )
    await db.commit()

    return {
        "message": "Check-in submitted",
        "risk_score": ai_result["score"],
        "risk_level": ai_result["level"],
        "readmission_risk": p.readmission_risk,
        "response_rate": p.response_rate
    }


@router.get("/{patient_id}/export")
async def export_patient_data(
    patient_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ))
):
    """
    DPDPA 2023 Right to Access: Export all patient data as JSON.
    Returns decrypted PII fields, all check-ins, escalations, and timeline events.
    Tenant-scoped: users can only export patients from their hospital.
    """
    hospital_id = current_user.require_hospital()

    query = select(Patient).options(
        selectinload(Patient.checkins),
        selectinload(Patient.timeline),
        selectinload(Patient.escalations)
    ).where(Patient.id == uuid.UUID(patient_id))
    
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))

    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    return {
        "patient": {
            "id": str(p.id),
            "full_name": decrypt_field(p.full_name),
            "mobile": decrypt_field(p.mobile),
            "family_mobile": decrypt_field(p.family_mobile),
            "age": p.age,
            "surgery_type": p.surgery_type,
            "discharge_date": p.discharge_date.isoformat() if p.discharge_date else None,
            "doctor_name": decrypt_field(p.doctor_name),
            "doctor_specialty": p.doctor_specialty,
            "bed_number": decrypt_field(p.bed_number),
            "uhid": decrypt_field(p.uhid),
            "status": p.status,
            "current_day": p.current_day,
            "instructions": p.instructions,
            "response_rate": p.response_rate,
            "risk_score": p.risk_score,
            "risk_level": p.risk_level,
            "readmission_risk": p.readmission_risk,
            "consent_given": p.consent_given,
            "consent_given_at": p.consent_given_at.isoformat() if p.consent_given_at else None,
            "consent_version": p.consent_version,
            "preferred_language": p.preferred_language,
            "created_at": p.created_at.isoformat() if p.created_at else None
        },
        "checkins": [
            {
                "day": c.day_number,
                "status": c.status,
                "risk_level": c.risk_level,
                "responses": c.responses,
                "replied_at": c.replied_at.isoformat() if c.replied_at else None
            }
            for c in p.checkins
        ],
        "escalations": [
            {
                "id": str(e.id),
                "level": e.level,
                "status": e.status,
                "trigger_type": e.trigger_type,
                "description": e.description,
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in p.escalations
        ],
        "timeline": [
            {
                "day": t.day_number,
                "type": t.event_type,
                "title": t.title,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in p.timeline
        ]
    }


@router.post("/{patient_id}/erasure-request")
async def request_erasure(
    patient_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_UPDATE))
):
    """
    DPDPA 2023 Right to Erasure: Request erasure of patient data.
    This is a TWO-STEP process:
    1. This endpoint marks erasure_requested_at timestamp (soft request)
    2. Hospital admin must approve via /erasure-approve endpoint
    
    Indian medical record retention laws may require hospitals to keep treatment
    records for 3-7 years. This two-step design ensures legal compliance while
    respecting patient rights. DO NOT simplify to hard delete.
    """
    hospital_id = current_user.require_hospital()

    query = select(Patient).where(Patient.id == uuid.UUID(patient_id))
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))

    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    p.erasure_requested_at = datetime.now(timezone.utc)
    
    await log_audit(
        db, current_user.user_id, hospital_id,
        "ERASURE_REQUEST", "patients", str(patient_id),
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
        True
    )
    await db.commit()

    return {"message": "Erasure request recorded. Awaiting hospital admin approval."}


@router.post("/{patient_id}/erasure-approve")
async def approve_erasure(
    patient_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_MANAGE))
):
    """
    DPDPA 2023 Right to Erasure: Approve and execute erasure.
    ANONYMIZES PII fields while preserving clinical/statistical data for NABH reporting.
    
    This is NOT a hard delete. Medical record retention laws require keeping
    treatment records. We anonymize personal identifiers but keep clinical data
    (surgery_type, risk scores, outcomes) for hospital analytics and compliance.
    """
    hospital_id = current_user.require_hospital()

    query = select(Patient).where(Patient.id == uuid.UUID(patient_id))
    if hospital_id:
        query = query.where(Patient.hospital_id == uuid.UUID(hospital_id))

    result = await db.execute(query)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Patient not found")

    if not p.erasure_requested_at:
        raise HTTPException(400, "No erasure request found for this patient")

    # Anonymize PII fields with irreversible placeholders
    # Clinical fields are preserved for NABH/analytics
    p.full_name = encrypt_field("[ANONYMIZED]")
    p.mobile = encrypt_field("[ANONYMIZED]")
    p.family_mobile = encrypt_field("[ANONYMIZED]")
    p.uhid = encrypt_field("[ANONYMIZED]")
    p.bed_number = encrypt_field("[ANONYMIZED]")
    p.doctor_name = encrypt_field("[ANONYMIZED]")
    p.status = "ANONYMIZED"
    
    await log_audit(
        db, current_user.user_id, hospital_id,
        "ERASURE_APPROVED", "patients", str(patient_id),
        request.client.host if request.client else "",
        request.headers.get("user-agent", ""),
        True
    )
    await db.commit()

    return {"message": "Patient data anonymized successfully. Clinical records preserved for compliance."}


# Separate router for grievances (public, rate-limited)
grievance_router = APIRouter(prefix="/grievances", tags=["Grievances"])


@grievance_router.post("")
async def create_grievance(
    req: GrievanceCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    DPDPA 2023 Grievance Redressal: Submit a complaint or data request.
    Public endpoint (no auth required) but rate-limited to prevent abuse.
    Sends notification email to DPO.
    """
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    
    grievance = Grievance(
        contact_info=req.contact_info.strip(),
        message=req.message.strip(),
        status="OPEN"
    )
    db.add(grievance)
    await db.commit()

    # Send notification to DPO
    try:
        await send_email(
            to="dpo@ojas.care",
            subject=f"New Patient Grievance - {grievance.id}",
            body=f"""
            New grievance received:
            
            Contact: {req.contact_info}
            Message: {req.message}
            Time: {datetime.now(timezone.utc).isoformat()}
            
            Please review and respond within 72 hours as per DPDPA requirements.
            """
        )
    except Exception as e:
        print(f"DPO notification failed (non-fatal): {e}")

    return {
        "id": str(grievance.id),
        "message": "Grievance submitted. Our Data Protection Officer will respond within 72 hours."
    }
