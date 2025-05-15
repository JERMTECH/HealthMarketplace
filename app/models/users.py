from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    type = Column(String)  # "clinic" or "patient"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    clinic = relationship("Clinic", back_populates="user", uselist=False)
    patient = relationship("Patient", back_populates="user", uselist=False)