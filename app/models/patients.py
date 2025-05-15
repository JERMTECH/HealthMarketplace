from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, ForeignKey("users.id"), primary_key=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)  # Stored as ISO string format
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    reward_points = relationship("RewardPoint", back_populates="patient")
    reward_card = relationship("RewardCard", back_populates="patient", uselist=False)