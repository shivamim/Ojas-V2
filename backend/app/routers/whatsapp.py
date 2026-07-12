import uuid
import hashlib
import hmac
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.tenant import require_tenant
from app.core.encryption import decrypt_field
from app.core.rbac import Permission, require_permission, get_current_user, CurrentUser
from app.core.config import settings
from app.models.patient import Patient
from app.models.checkin import CheckIn
from app.models.escalation import Escalation
from app.models.whatsapp_log import WhatsAppMessageLog
from app.services.whatsapp import send_whatsapp_message, send_template_message
from app.services.ai_scoring import calculate_risk_score

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def verify_whatsapp_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Verify the HMAC-SHA256 signature of a WhatsApp webhook request.
    
    Args:
        raw_body: The raw request body bytes
        signature_header: The X-Hub-Signature-256 header value (format: "sha256=<hex>")
    
    Returns:
        True if signature is valid, False otherwise
    """
    if not settings.WHATSAPP_APP_SECRET:
        # If no secret configured, skip verification (development mode)
        return True
    
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    
    expected_signature = signature_header.replace("sha256=", "")
    computed_signature = hmac.new(
        settings.WHATSAPP_APP_SECRET.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, computed_signature)


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Meta WhatsApp subscription verification handshake.
    Returns hub.challenge if verify_token matches.
    """
    hub_mode = request.query_params.get("hub.mode")
    hub_verify_token = request.query_params.get("hub.verify_token")
    hub_challenge = request.query_params.get("hub.challenge")
    
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        return int(hub_challenge) if hub_challenge.isdigit() else hub_challenge
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def handle_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle inbound WhatsApp messages from patients.
    - Verifies HMAC-SHA256 signature for security
    - Matches sender phone to Patient.mobile_lookup_hash (indexed lookup)
    - Finds earliest PENDING check-in
    - Parses response and updates check-in
    - Triggers AI scoring and escalation if needed
    - Handles HELP/SOS keywords for immediate critical escalation
    """
    # Security: Verify webhook signature before processing
    raw_body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256", "")
    
    if not verify_whatsapp_signature(raw_body, signature_header):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing webhook signature"
        )
    
    try:
        payload = json.loads(raw_body)
    except Exception:
        return {"status": "ok"}  # Never error back to Meta
    
    if not payload.get("entry"):
        return {"status": "ok"}
    
    for entry in payload["entry"]:
        if not entry.get("changes"):
            continue
        
        for change in entry["changes"]:
            if change.get("field") != "messages":
                continue
            
            value = change.get("value", {})
            messages = value.get("messages", [])
            
            for msg in messages:
                if msg.get("type") != "text":
                    continue  # Skip images, audio, etc. for now
                
                from_number = msg.get("from")
                message_text = msg.get("text", {}).get("body", "").strip()
                
                if not from_number or not message_text:
                    continue
                
                # Match patient by phone number using indexed mobile_lookup_hash
                # This is O(1) instead of O(n) - no more mass decryption
                from app.core.encryption import get_mobile_lookup_hash
                lookup_hash = get_mobile_lookup_hash(from_number)
                
                result = await db.execute(
                    select(Patient).where(Patient.mobile_lookup_hash == lookup_hash).limit(1)
                )
                matched_patient = result.scalar_one_or_none()
                
                if not matched_patient:
                    print(f"[WEBHOOK] No patient found for {from_number}")
                    return {"status": "ok"}  # Don't error for unmatched senders
                
                # Check for HELP/SOS - immediate critical escalation
                if any(keyword in message_text.upper() for keyword in ["HELP", "SOS", "EMERGENCY"]):
                    escalation = Escalation(
                        patient_id=matched_patient.id,
                        level="CRITICAL",
                        status="OPEN",
                        trigger_type="PATIENT_HELP_REQUEST",
                        trigger_detail=f"Patient sent: {message_text[:200]}",
                        description="Patient explicitly requested help via WhatsApp"
                    )
                    db.add(escalation)
                    matched_patient.status = "ESCALATED"
                    await db.commit()
                    
                    print(f"[WEBHOOK] CRITICAL escalation created for patient {matched_patient.id}")
                    return {"status": "ok"}
                
                # Find earliest PENDING check-in
                checkin_result = await db.execute(
                    select(CheckIn)
                    .where(CheckIn.patient_id == matched_patient.id, CheckIn.status == "PENDING")
                    .order_by(CheckIn.day_number.asc())
                )
                checkin = checkin_result.scalar_one_or_none()
                
                if not checkin:
                    print(f"[WEBHOOK] No pending check-in for patient {matched_patient.id}")
                    return {"status": "ok"}
                
                # Parse simple text responses
                # Expected format: "pain: 3, fever: yes" or "3" or "fever no"
                responses = {}
                pain_level = 0
                
                # Try to extract pain level
                if "pain:" in message_text.lower():
                    try:
                        pain_str = message_text.lower().split("pain:")[1].split(",")[0].strip()
                        pain_level = int(pain_str.split()[0])
                    except (ValueError, IndexError):
                        pass
                elif message_text[0].isdigit():
                    try:
                        pain_level = int(message_text[0])
                    except ValueError:
                        pass
                
                responses["pain"] = str(pain_level)
                
                # Check for fever
                if any(word in message_text.lower() for word in ["fever: yes", "fever:yes", "fever y", "has fever", "fever present"]):
                    responses["fever"] = "yes"
                elif any(word in message_text.lower() for word in ["fever: no", "fever:no", "fever n", "no fever", "without fever"]):
                    responses["fever"] = "no"
                else:
                    responses["fever"] = "N/A"
                
                # Update check-in
                checkin.status = "COMPLETED"
                checkin.replied_at = datetime.now(timezone.utc).replace(tzinfo=None)
                checkin.responses = responses
                checkin.pain_level = pain_level
                
                # Run AI scoring
                ai_result = calculate_risk_score(responses, {"response_rate": matched_patient.response_rate})
                checkin.risk_score = ai_result["score"]
                checkin.risk_level = ai_result["level"]
                checkin.risk_reasons = ai_result["reasons"]
                
                matched_patient.risk_score = ai_result["score"]
                matched_patient.risk_level = ai_result["level"]
                matched_patient.current_day = checkin.day_number
                
                # Create escalation if critical
                if ai_result["level"] == "CRITICAL":
                    escalation = Escalation(
                        patient_id=matched_patient.id,
                        level="CRITICAL",
                        status="OPEN",
                        trigger_type="ai_risk",
                        trigger_detail=f"Day {checkin.day_number} webhook response: {ai_result['score']}",
                        description="; ".join(ai_result["reasons"])
                    )
                    db.add(escalation)
                    matched_patient.status = "ESCALATED"
                
                await db.commit()
                print(f"[WEBHOOK] Check-in completed for patient {matched_patient.id}, day {checkin.day_number}")
    
    return {"status": "ok"}


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
    
    # Use template message for business-initiated outreach
    from app.services.whatsapp_templates import get_template, format_template
    template = get_template(p.preferred_language or "en", day)
    message_text = format_template(template, {"patient_name": name, "day": str(day)})

    log = WhatsAppMessageLog(
        patient_id=p.id,
        message_type=f"day_{day}_checkin",
        status="SENT"
    )
    db.add(log)
    await db.commit()

    try:
        # Use template message for compliance with Meta policy
        resp = await send_template_message(
            mobile, 
            template["name"], 
            template["language_code"], 
            [name, str(day)] if "day" in template.get("variables", []) else [name]
        )
    except Exception as e:
        print(f"WhatsApp template send failed: {e}")
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
