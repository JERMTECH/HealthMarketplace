from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime

class SeasonBase(BaseModel):
    name: str
    start_date: str
    end_date: str
    multiplier: str
    description: Optional[str] = None
    is_active: bool = False

class SeasonCreate(SeasonBase):
    pass

class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    multiplier: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SeasonResponse(SeasonBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class RewardConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = False
    base_rate: str
    season_multiplier: str = "1.0"
    product_category_rules: str  # JSON string of rules by product category

class RewardConfigCreate(RewardConfigBase):
    pass

class RewardConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    base_rate: Optional[str] = None
    season_multiplier: Optional[str] = None
    product_category_rules: Optional[str] = None

class RewardConfigResponse(RewardConfigBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        orm_mode = True

class RewardCalculationRequest(BaseModel):
    product_id: str
    price: float
    quantity: int
    category: Optional[str] = None

class RewardCalculationResponse(BaseModel):
    points: int
    base_points: float
    seasonal_multiplier: float
    category_multiplier: float
    calculation_breakdown: Dict[str, Any]