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
@router.get("/all")
async def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Allow both admin and clinic users
    if not is_admin(current_user) and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view all patients")
    
    patients_response_data = []
    
    # Join with user table to get names and emails
    patient_records = db.query(Patient, User).join(User, User.id == Patient.id).all()
    
    for patient, user in patient_records:
        patient_data = {
            "id": patient.id,
            "name": user.name,
            "email": user.email,
            "phone": patient.phone,
            "address": patient.address,
            "date_of_birth": patient.date_of_birth,
            "is_active": user.is_active, # Include is_active status
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
            "updated_at": patient.updated_at.isoformat() if patient.updated_at else None
        }
        patients_response_data.append(patient_data)
        
    return patients_response_data

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
    # Authorization: Patient can update self, or Admin can update any patient
    is_patient_self = (current_user.id == patient_id and current_user.type == "patient")
    is_system_admin = is_admin(current_user)

    if not (is_patient_self or is_system_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this patient's profile")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update patient
    for key, value in patient_data.dict(exclude_unset=True).items():
        setattr(patient, key, value)
    
    # Update user name if it changed
    user = db.query(User).filter(User.id == patient_id).first()
    if not user:
        # This case should ideally not happen if patient exists, implies data inconsistency
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated user data not found for this patient")

    if patient_data.name is not None: # Check if name is part of the update
        user.name = patient_data.name
    
    db.commit()
    db.refresh(patient)
    if patient_data.name is not None: # If user was changed, refresh user too
        db.refresh(user)
    
    # Construct and return PatientResponse
    return PatientResponse(
        id=patient.id,
        name=user.name, # Use potentially updated name
        email=user.email, # Email is not updatable via this endpoint
        phone=patient.phone,
        address=patient.address,
        date_of_birth=patient.date_of_birth,
        created_at=patient.created_at,
        updated_at=patient.updated_at
        # is_active is part of PatientResponse schema if it inherits from PatientBase which includes it
        # However, PatientResponse in schemas/patient.py does not have is_active.
        # If PatientResponse should have is_active, the schema needs an update.
        # For now, follow the existing PatientResponse schema.
    )