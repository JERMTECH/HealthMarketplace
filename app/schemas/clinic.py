from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ClinicServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: str
    duration: str
    available: Optional[str] = "true"

class ClinicServiceCreate(ClinicServiceBase):
    pass

class ClinicServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    duration: Optional[str] = None
    available: Optional[str] = None

class ClinicServiceResponse(ClinicServiceBase):
    id: str
    clinic_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClinicBase(BaseModel):
    name: str
    email: str
    specialization: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class ClinicCreate(ClinicBase):
    pass

class ClinicUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class ClinicResponse(ClinicBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    services: Optional[List[ClinicServiceResponse]] = []

    class Config:
        from_attributes = True