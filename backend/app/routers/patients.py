import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import encrypt_field, decrypt_field
from app.core.rbac import Permission, require_permission, get_current_user, CurrentUser
from app.core.audit import log_audit
from app.models.patient import Patient
from app.models.checkin import CheckIn
from app.models.escalation import Escalation
from app.models.timeline import TimelineEvent
from app.services.ai_scoring import calculate_risk_score
from app.services.readmission_risk import predict_readmission_risk
from app.services.whatsapp import send_whatsapp_message

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


class PatientUpdate(BaseModel):
    status: Optional[str] = None
    current_day: Optional[int] = Field(None, ge=1, le=14)
    instructions: Optional[str] = None


@router.post("")
async def create_patient(
    req: PatientCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission(Permission.PATIENT_CREATE))
):
    hospital_id = current_user.require_hospital()

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
        total_days=14
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
