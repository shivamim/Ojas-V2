import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime, timezone

class WhatsAppMessageLog(Base):
    __tablename__ = "whatsapp_message_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"))
    message_type = Column(String)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    status = Column(String, default="SENT")
    retry_count = Column(Integer, default=0)
    error_detail = Column(String, nullable=True)
