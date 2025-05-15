from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RewardPointBase(BaseModel):
    points: str
    description: str
    source_id: Optional[str] = None
    type: str = "earned"  # "earned" or "redeemed"

class RewardPointCreate(RewardPointBase):
    pass

class RewardPointResponse(RewardPointBase):
    id: str
    patient_id: str
    created_at: datetime

    class Config:
        orm_mode = True

class RewardCardBase(BaseModel):
    patient_id: str

class RewardCardCreate(RewardCardBase):
    pass

class RewardCardResponse(BaseModel):
    id: str
    patient_id: str
    card_number: str
    issued_date: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class PartnerShopCategoryBase(BaseModel):
    name: str

class PartnerShopCategoryCreate(PartnerShopCategoryBase):
    pass

class PartnerShopCategoryResponse(PartnerShopCategoryBase):
    id: str
    partner_shop_id: str

    class Config:
        orm_mode = True

class PartnerShopBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None

class PartnerShopCreate(PartnerShopBase):
    categories: List[PartnerShopCategoryCreate]

class PartnerShopResponse(PartnerShopBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    categories: List[PartnerShopCategoryResponse] = []

    class Config:
        orm_mode = True

class RewardsInfoResponse(BaseModel):
    earn_rates: dict
    redemption_rate: int
    partner_shops: List[PartnerShopResponse]

class PatientRewardsResponse(BaseModel):
    total_points: int
    history: List[RewardPointResponse]
    card: Optional[RewardCardResponse] = None