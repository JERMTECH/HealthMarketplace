from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    type: str  # "clinic" or "patient"

class UserCreate(UserBase):
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    specialization: Optional[str] = None  # For clinics
    location: Optional[str] = None  # For clinics
    date_of_birth: Optional[str] = None  # For patients

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    specialization: Optional[str] = None  # For clinics
    location: Optional[str] = None  # For clinics
    date_of_birth: Optional[str] = None  # For patients

class UserResponse(UserBase):
    id: str
    is_active: bool

    class Config:
        orm_mode = True