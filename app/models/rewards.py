from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class RewardPoint(Base):
    __tablename__ = "reward_points"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    points = Column(String)  # Number of points earned/redeemed
    description = Column(String)
    source_id = Column(String, nullable=True)  # ID of the source (appointment, order, etc.)
    type = Column(String, default="earned")  # earned or redeemed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="reward_points")

class RewardCard(Base):
    __tablename__ = "reward_cards"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), unique=True)
    card_number = Column(String, unique=True)
    issued_date = Column(String)  # ISO format date string
    status = Column(String, default="active")  # active, inactive, expired
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="reward_card")

class PartnerShop(Base):
    __tablename__ = "partner_shops"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    categories = relationship("PartnerShopCategory", back_populates="partner_shop")

class PartnerShopCategory(Base):
    __tablename__ = "partner_shop_categories"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    partner_shop_id = Column(String, ForeignKey("partner_shops.id"))
    name = Column(String)
    
    # Relationships
    partner_shop = relationship("PartnerShop", back_populates="categories")