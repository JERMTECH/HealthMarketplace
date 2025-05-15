from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base

class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String, ForeignKey("users.id"), primary_key=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    location = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="clinic")
    services = relationship("ClinicService", back_populates="clinic")
    products = relationship("Product", back_populates="clinic")
    appointments = relationship("Appointment", back_populates="clinic")
    prescriptions = relationship("Prescription", back_populates="clinic")

class ClinicService(Base):
    __tablename__ = "clinic_services"

    id = Column(String, primary_key=True, index=True)
    clinic_id = Column(String, ForeignKey("clinics.id"))
    name = Column(String)
    description = Column(String, nullable=True)
    price = Column(String)  # Stored as string for floating-point precision
    duration = Column(String)  # Minutes, stored as string
    available = Column(String, default="true")  # Boolean stored as string "true"/"false"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    clinic = relationship("Clinic", back_populates="services")