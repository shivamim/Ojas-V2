"""
WhatsApp messaging service using Meta/360dialog API.

Production Requirements:
- Set WHATSAPP_API_KEY environment variable (360dialog or Meta)
- Set WHATSAPP_API_URL to your WhatsApp Business API endpoint
- Configure approved message templates for business-initiated messages
- Implement message queue with retry logic for high volume

Important Notes:
- Free-form messages only work within 24-hour user session window
- Template messages required for business-initiated outreach
- Phone numbers must be in E.164 format (e.g., +919876543210)
"""
import logging
import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_whatsapp_message(
    to: str, 
    message: str, 
    buttons: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Send free-form WhatsApp text message.
    
    Use within 24-hour customer session window only.
    For business-initiated messages outside session, use send_template_message().
    
    Args:
        to: Recipient phone number in E.164 format
        message: Message content to send
        buttons: Optional list of interactive buttons [{id, title}]
        
    Returns:
        Response dict with message ID and status
    """
    if not settings.WHATSAPP_API_KEY:
        logger.warning(
            f"WHATSAPP_API_KEY not configured. WhatsApp message to {to} skipped."
        )
        return {
            "status": "skipped",
            "reason": "WHATSAPP_API_KEY not configured",
            "recipient": to
        }

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_KEY}", 
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "interactive" if buttons else "text",
    }
    if buttons:
        payload["interactive"] = {
            "type": "button",
            "body": {"text": message},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}} 
                    for b in buttons
                ]
            }
        }
    else:
        payload["text"] = {"body": message}

    # Add timeout and retry logic for production reliability
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(settings.WHATSAPP_API_URL, json=payload, headers=headers)
            r.raise_for_status()
            result = r.json()
            logger.info(f"WhatsApp message sent successfully to {to}: {result.get('messages', [{}])[0].get('id')}")
            return result
        except httpx.TimeoutException:
            logger.error(f"WhatsApp timeout for {to}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "timeout-msg-id", "status": "failed_timeout"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp HTTP error ({e.response.status_code}) for {to}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "http-error-msg-id", "status": "failed_http_error"}
        except Exception as e:
            logger.error(f"WhatsApp unexpected error for {to}: {e}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "error-msg-id", "status": "failed_error"}


async def send_template_message(
    to: str, 
    template_name: str, 
    language_code: str, 
    variables: List[str]
) -> Dict[str, Any]:
    """
    Send WhatsApp template message for business-initiated outreach.
    
    Required for messages outside 24-hour customer session (e.g., daily check-ins).
    Templates must be pre-approved in Meta/360dialog dashboard.
    
    Args:
        to: Recipient phone number in E.164 format
        template_name: Pre-approved template name in Meta/360dialog
        language_code: ISO language code (en, hi, etc.)
        variables: List of variable values for template substitution
        
    Returns:
        Response dict with message ID and status
    """
    if not settings.WHATSAPP_API_KEY:
        logger.warning(
            f"WHATSAPP_API_KEY not configured. Template '{template_name}' to {to} skipped."
        )
        return {
            "status": "skipped",
            "reason": "WHATSAPP_API_KEY not configured",
            "template": template_name,
            "recipient": to
        }

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_KEY}", 
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": language_code
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": var} for var in variables
                    ]
                }
            ]
        }
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(settings.WHATSAPP_API_URL, json=payload, headers=headers)
            r.raise_for_status()
            result = r.json()
            logger.info(f"WhatsApp template '{template_name}' sent successfully to {to}: {result.get('messages', [{}])[0].get('id')}")
            return result
        except httpx.TimeoutException:
            logger.error(f"WhatsApp template timeout for {to}")
            return {"id": "timeout-template-id", "status": "failed_timeout"}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp template HTTP error ({e.response.status_code}) for {to}")
            return {"id": "http-error-template-id", "status": "failed_http_error"}
        except Exception as e:
            logger.error(f"WhatsApp template unexpected error for {to}: {e}")
            return {"id": "error-template-id", "status": "failed_error"}


async def send_family_nudge(
    family_mobile: str, 
    patient_name: str, 
    day: int
) -> Dict[str, Any]:
    """
    Send a family nudge message when patient hasn't checked in.
    
    Args:
        family_mobile: Family member's phone number
        patient_name: Patient's name for personalization
        day: Day number since last check-in
        
    Returns:
        Response dict with message ID and status
    """
    msg = (
        f"Ojas Alert: Your family member {patient_name} has not responded to their "
        f"Day {day} recovery check-in. Please ensure they are comfortable. "
        f"Reply HELP for assistance."
    )
    return await send_whatsapp_message(family_mobile, msg)
