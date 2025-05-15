from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AppointmentBase(BaseModel):
    clinic_id: str
    service_id: str
    date: str
    time: str
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: str
    patient_id: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Additional fields from related tables
    clinic_name: Optional[str] = None
    service_name: Optional[str] = None
    patient_name: Optional[str] = None

    class Config:
        orm_mode = True

class AppointmentStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    cancelled: int
    completed: int