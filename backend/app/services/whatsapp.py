import httpx
from app.core.config import settings

async def send_whatsapp_message(to: str, message: str, buttons: list = None):
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

    async with httpx.AsyncClient() as client:
        r = await client.post(settings.WHATSAPP_API_URL, json=payload, headers=headers)
        return r.json()

async def send_family_nudge(family_mobile: str, patient_name: str, day: int):
    msg = f"Ojas Alert: Your family member {patient_name} has not responded to their Day {day} recovery check-in. Please ensure they are comfortable. Reply HELP for assistance."
    return await send_whatsapp_message(family_mobile, msg)
