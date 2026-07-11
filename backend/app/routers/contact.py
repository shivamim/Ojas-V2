from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
import logging

router = APIRouter()

class ContactForm(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    hospital_name: str
    message: str

@router.post("/contact", status_code=status.HTTP_200_OK)
async def submit_contact(form: ContactForm):
    logging.info(f"Contact form from {form.email} at {form.hospital_name}")
    # TODO: Email sending can be added later. For now, just accept and log.
    return {"status": "success", "message": "Message received. We will contact you shortly."}
