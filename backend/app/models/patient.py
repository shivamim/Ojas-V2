import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id"), index=True)
    full_name = Column(String)
    mobile = Column(String)
    family_mobile = Column(String)
    age = Column(Integer)
    surgery_type = Column(String)
    discharge_date = Column(DateTime)
    doctor_name = Column(String)
    doctor_specialty = Column(String)
    bed_number = Column(String)
    uhid = Column(String)
    status = Column(String, default="ACTIVE")
    current_day = Column(Integer, default=1)
    total_days = Column(Integer, default=14)
    instructions = Column(Text)
    response_rate = Column(Float, default=0.0)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="LOW")
    readmission_risk = Column(String, default="LOW")
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="patients")
    checkins = relationship("CheckIn", back_populates="patient", cascade="all, delete")
    escalations = relationship("Escalation", back_populates="patient", cascade="all, delete")
    timeline = relationship("TimelineEvent", back_populates="patient", cascade="all, delete")
