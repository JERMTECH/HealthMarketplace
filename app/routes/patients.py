from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.users import User
from app.models.patients import Patient
from app.schemas.patient import PatientResponse, PatientUpdate
from app.auth import get_current_active_user

router = APIRouter()

# Get all patients (admin only in a real app)
@router.get("/", response_model=List[PatientResponse])
async def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # In a real app, check if admin
    if current_user.type != "clinic":
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
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return patient

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