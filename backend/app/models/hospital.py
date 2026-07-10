import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True)
    city = Column(String)
    state = Column(String)
    bed_count = Column(Integer, default=100)
    nabh_level = Column(String, default="Entry Level")
    contact_email = Column(String)
    contact_phone = Column(String)
    plan_type = Column(String, default="trial")
    logo_url = Column(String, nullable=True)
    nabh_certificate_number = Column(String, nullable=True)
    settings = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="hospital")
    patients = relationship("Patient", back_populates="hospital")
