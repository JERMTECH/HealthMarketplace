from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

from app.database import get_db
from app.models.users import User
from app.models.patients import Patient
from app.schemas.patient import PatientResponse, PatientUpdate
from app.auth import get_current_active_user

router = APIRouter()

# Helper function to check if user is admin
def is_admin(user):
    admin_types = ['admin', 'administrator', 'system']
    return user.type.lower() in [t.lower() for t in admin_types]

# Get patients count for admin dashboard
@router.get("/count", response_model=Dict[str, int])
async def get_patients_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    count = db.query(func.count(Patient.id)).scalar()
    return {"count": count}

# Get all patients (admin only in a real app)
@router.get("/all", response_model=List[PatientResponse])
async def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Allow both admin and clinic users
    if not is_admin(current_user) and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view all patients")
    
    patients = db.query(Patient).all()
    return patients

# Get a specific patient
@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view this patient")
    
    # Query patient with user data joined
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get user data to include name and email
    user = db.query(User).filter(User.id == patient_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create a combined response with data from both models
    response_data = {
        "id": patient.id,
        "name": user.name,
        "email": user.email,
        "phone": patient.phone,
        "address": patient.address,
        "date_of_birth": patient.date_of_birth,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at
    }
    
    return response_data

# Update patient
@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this patient")
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update patient
    for key, value in patient_data.dict(exclude_unset=True).items():
        setattr(patient, key, value)
    
    # Update user name if it changed
    if patient_data.name:
        user = db.query(User).filter(User.id == patient_id).first()
        if user:
            user.name = patient_data.name
    
    db.commit()
    db.refresh(patient)
    
    return patient