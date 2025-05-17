from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class RewardConfig(Base):
    __tablename__ = "reward_configs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)  # Name of the configuration
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)  # Only one config can be active at a time
    base_rate = Column(String)  # Base points per dollar
    season_multiplier = Column(String, default="1.0")  # Multiplier for seasonal promotions
    product_category_rules = Column(String)  # JSON string of rules by product category
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)  # Admin who created this config

class Season(Base):
    __tablename__ = "seasons"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)  # e.g., "Summer 2025", "Holiday 2025"
    start_date = Column(String)  # ISO format date string
    end_date = Column(String)  # ISO format date string
    multiplier = Column(String, default="1.0")  # Seasonal multiplier for rewards
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())