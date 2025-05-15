from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    notes: Optional[str] = None

class MedicationCreate(MedicationBase):
    pass

class MedicationResponse(MedicationBase):
    id: str
    prescription_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class PrescriptionBase(BaseModel):
    patient_id: str
    issue_date: str
    valid_until: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    medications: List[MedicationCreate]

class PrescriptionUpdate(BaseModel):
    issue_date: Optional[str] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionResponse(PrescriptionBase):
    id: str
    clinic_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    medications: List[MedicationResponse] = []
    
    # Additional fields from related tables
    clinic_name: Optional[str] = None
    patient_name: Optional[str] = None

    class Config:
        orm_mode = True