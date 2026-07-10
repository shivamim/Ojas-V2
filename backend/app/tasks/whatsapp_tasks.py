# Celery-ready async tasks (simulated with async functions for zero-cost demo)
# Replace with actual Celery when scaling

from app.services.whatsapp import send_whatsapp_message, send_family_nudge

async def queue_whatsapp_checkin(patient_id: str, day: int, mobile: str, message: str):
    # In production: celery_app.send_task(...)
    return await send_whatsapp_message(mobile, message)

async def queue_family_nudge(patient_id: str, day: int, family_mobile: str, patient_name: str):
    return await send_family_nudge(family_mobile, patient_name, day)
