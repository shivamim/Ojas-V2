import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), index=True)
    day_number = Column(Integer)
    status = Column(String, default="PENDING")
    sent_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    responses = Column(JSON, default=dict)
    pain_level = Column(Integer, nullable=True)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")
    risk_reasons = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="checkins")
