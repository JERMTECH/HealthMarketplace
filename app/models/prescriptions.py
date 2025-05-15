from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    clinic_id = Column(String, ForeignKey("clinics.id"))
    issue_date = Column(String)  # ISO format date string
    valid_until = Column(String, nullable=True)  # ISO format date string
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")
    clinic = relationship("Clinic", back_populates="prescriptions")
    medications = relationship("Medication", back_populates="prescription")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.id"))
    name = Column(String)
    dosage = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    prescription = relationship("Prescription", back_populates="medications")