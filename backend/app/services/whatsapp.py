import httpx
from fastapi import HTTPException
from app.core.config import settings

async def send_whatsapp_message(to: str, message: str, buttons: list = None):
    """
    Send free-form WhatsApp text message.
    Use within 24-hour customer session window only.
    For business-initiated messages outside session, use send_template_message().
    """
    if not settings.WHATSAPP_API_KEY:
        print(f"[SIMULATION] WhatsApp to {to}: {message}")
        return {"id": "simulated-msg-id", "status": "sent"}

    headers = {"Authorization": f"Bearer {settings.WHATSAPP_API_KEY}", "Content-Type": "application/json"}
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
            "action": {"buttons": [{"type": "reply", "reply": {"id": b["id"], "title": b["title"]}} for b in buttons]}
        }
    else:
        payload["text"] = {"body": message}

    # Add timeout and retry logic for production reliability
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(settings.WHATSAPP_API_URL, json=payload, headers=headers)
            r.raise_for_status()
            return r.json()
        except httpx.TimeoutException:
            print(f"WhatsApp timeout for {to}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "timeout-msg-id", "status": "failed_timeout"}
        except httpx.HTTPStatusError as e:
            print(f"WhatsApp HTTP error: {e.response.status_code}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "http-error-msg-id", "status": "failed_http_error"}
        except Exception as e:
            print(f"WhatsApp unexpected error: {e}")
            # Don't raise - fail gracefully to avoid blocking patient enrollment
            return {"id": "error-msg-id", "status": "failed_error"}


async def send_template_message(to: str, template_name: str, language_code: str, variables: list[str]) -> dict:
    """
    Send WhatsApp template message for business-initiated outreach.
    Required for messages outside 24-hour customer session (e.g., daily check-ins).
    
    Args:
        to: Recipient phone number
        template_name: Pre-approved template name in Meta/360dialog
        language_code: ISO language code (en, hi, etc.)
        variables: List of variable values for template substitution
    """
    if not settings.WHATSAPP_API_KEY:
        print(f"[SIMULATION] Template '{template_name}' to {to}: vars={variables}")
        return {"id": "simulated-template-id", "status": "sent"}

    headers = {"Authorization": f"Bearer {settings.WHATSAPP_API_KEY}", "Content-Type": "application/json"}
    
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
            return r.json()
        except httpx.TimeoutException:
            print(f"WhatsApp template timeout for {to}")
            return {"id": "timeout-template-id", "status": "failed_timeout"}
        except httpx.HTTPStatusError as e:
            print(f"WhatsApp template HTTP error: {e.response.status_code}")
            return {"id": "http-error-template-id", "status": "failed_http_error"}
        except Exception as e:
            print(f"WhatsApp template unexpected error: {e}")
            return {"id": "error-template-id", "status": "failed_error"}


async def send_family_nudge(family_mobile: str, patient_name: str, day: int):
    msg = f"Ojas Alert: Your family member {patient_name} has not responded to their Day {day} recovery check-in. Please ensure they are comfortable. Reply HELP for assistance."
    return await send_whatsapp_message(family_mobile, msg)
