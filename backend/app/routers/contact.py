from fastapi import APIRouter, Depends, HTTPException, Request, Body
from pydantic import BaseModel, EmailStr, Field, field_validator
import logging

router = APIRouter()

class ContactForm(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    hospital_name: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)

@router.post("/contact", status_code=200)
async def submit_contact(form: ContactForm):
    logging.info(f"Contact form from {form.email} at {form.hospital_name}")
    # TODO: Email sending can be added later. For now, just accept and log.
    return {"status": "success", "message": "Message received. We will contact you shortly."}
