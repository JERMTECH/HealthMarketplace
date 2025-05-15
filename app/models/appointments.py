from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    clinic_id = Column(String, ForeignKey("clinics.id"))
    service_id = Column(String, ForeignKey("clinic_services.id"))
    date = Column(String)  # ISO format date string
    time = Column(String)  # Time string in 24h format (HH:MM)
    status = Column(String, default="pending")  # pending, confirmed, cancelled, completed
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    clinic = relationship("Clinic", back_populates="appointments")
    service = relationship("ClinicService")