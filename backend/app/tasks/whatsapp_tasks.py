"""
Background task queue for WhatsApp messaging.

In development: Uses async functions for simplicity.
In production: Replace with Celery tasks using Redis broker.

To configure Celery for production:
1. Install celery[redis]: pip install "celery[redis]"
2. Set CELERY_BROKER_URL=redis://localhost:6379/0
3. Create celery_app.py with proper configuration
4. Replace async calls with celery_app.send_task()
5. Run worker: celery -A app.celery_app worker --loglevel=info
"""

import logging
from typing import Optional, Dict, Any

from app.services.whatsapp import send_whatsapp_message, send_family_nudge

logger = logging.getLogger(__name__)


async def queue_whatsapp_checkin(
    patient_id: str, 
    day: int, 
    mobile: str, 
    message: str
) -> Dict[str, Any]:
    """
    Queue a WhatsApp check-in message for delivery.
    
    In development: Sends immediately via async call.
    In production: Enqueue to Celery for background processing.
    
    Args:
        patient_id: UUID of the patient
        day: Day number in the check-in schedule
        mobile: Patient's mobile number
        message: Message content to send
        
    Returns:
        Response dict with status and message ID
    """
    try:
        logger.info(f"Queueing check-in message for patient {patient_id}, day {day}")
        result = await send_whatsapp_message(mobile, message)
        logger.info(f"Check-in message sent successfully: {result.get('id', 'unknown')}")
        return result
    except Exception as e:
        logger.error(f"Failed to send check-in message: {e}")
        # In production, this would be retried by Celery
        raise


async def queue_family_nudge(
    patient_id: str, 
    day: int, 
    family_mobile: str, 
    patient_name: str
) -> Dict[str, Any]:
    """
    Queue a family nudge message for delivery.
    
    In development: Sends immediately via async call.
    In production: Enqueue to Celery for background processing.
    
    Args:
        patient_id: UUID of the patient
        day: Day number since last check-in
        family_mobile: Family member's mobile number
        patient_name: Patient's name for personalization
        
    Returns:
        Response dict with status and message ID
    """
    try:
        logger.info(f"Queueing family nudge for patient {patient_id}, day {day}")
        result = await send_family_nudge(family_mobile, patient_name, day)
        logger.info(f"Family nudge sent successfully: {result.get('id', 'unknown')}")
        return result
    except Exception as e:
        logger.error(f"Failed to send family nudge: {e}")
        # In production, this would be retried by Celery
        raise


async def queue_template_message(
    patient_mobile: str,
    template_name: str,
    components: list
) -> Dict[str, Any]:
    """
    Queue a WhatsApp template message for delivery.
    
    Args:
        patient_mobile: Recipient's mobile number
        template_name: Name of the WhatsApp template
        components: Template component parameters
        
    Returns:
        Response dict with status and message ID
    """
    from app.services.whatsapp import send_template_message
    
    try:
        logger.info(f"Queueing template '{template_name}' for {patient_mobile}")
        result = await send_template_message(patient_mobile, template_name, components)
        logger.info(f"Template message sent successfully: {result.get('id', 'unknown')}")
        return result
    except Exception as e:
        logger.error(f"Failed to send template message: {e}")
        raise
