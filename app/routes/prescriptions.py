from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.users import User
from app.models.prescriptions import Prescription, Medication
from app.models.clinics import Clinic
from app.models.patients import Patient
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionUpdate,
    MedicationCreate
)
from app.auth import get_current_active_user

router = APIRouter()

# Get all prescriptions (admin only in a real app)
@router.get("/", response_model=List[PrescriptionResponse])
async def get_prescriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # In a real app, check if admin
    prescriptions = db.query(Prescription).all()
    
    # Enrich with related data
    result = []
    for prescription in prescriptions:
        clinic = db.query(Clinic).filter(Clinic.id == prescription.clinic_id).first()
        patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
        
        prescription_dict = {
            **prescription.__dict__,
            "clinic_name": clinic.name if clinic else None,
            "patient_name": patient.name if patient else None,
            "medications": prescription.medications
        }
        result.append(prescription_dict)
    
    return result

# Create a prescription
@router.post("/", response_model=PrescriptionResponse)
async def create_prescription(
    prescription_data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if clinic
    if current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Only clinics can create prescriptions")
    
    # Check if patient exists
    patient = db.query(Patient).filter(Patient.id == prescription_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Create prescription
    prescription = Prescription(
        id=str(uuid.uuid4()),
        patient_id=prescription_data.patient_id,
        clinic_id=current_user.id,
        issue_date=prescription_data.issue_date,
        valid_until=prescription_data.valid_until,
        notes=prescription_data.notes
    )
    
    db.add(prescription)
    db.flush()  # Flush to get the ID
    
    # Create medications
    medications = []
    for med_data in prescription_data.medications:
        medication = Medication(
            id=str(uuid.uuid4()),
            prescription_id=prescription.id,
            name=med_data.name,
            dosage=med_data.dosage,
            frequency=med_data.frequency,
            duration=med_data.duration,
            notes=med_data.notes
        )
        
        db.add(medication)
        medications.append(medication)
    
    db.commit()
    db.refresh(prescription)
    
    # Return with additional info
    clinic = db.query(Clinic).filter(Clinic.id == prescription.clinic_id).first()
    
    response = {
        **prescription.__dict__,
        "clinic_name": clinic.name if clinic else None,
        "patient_name": patient.name if patient else None,
        "medications": medications
    }
    
    return response

# Get patient prescriptions
@router.get("/patient/{patient_id}", response_model=List[PrescriptionResponse])
async def get_patient_prescriptions(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view these prescriptions")
    
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()
    
    # Enrich with related data
    result = []
    for prescription in prescriptions:
        clinic = db.query(Clinic).filter(Clinic.id == prescription.clinic_id).first()
        patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
        
        prescription_dict = {
            **prescription.__dict__,
            "clinic_name": clinic.name if clinic else None,
            "patient_name": patient.name if patient else None,
            "medications": prescription.medications
        }
        result.append(prescription_dict)
    
    return result

# Get clinic prescriptions
@router.get("/clinic/{clinic_id}", response_model=List[PrescriptionResponse])
async def get_clinic_prescriptions(
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != clinic_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view these prescriptions")
    
    prescriptions = db.query(Prescription).filter(Prescription.clinic_id == clinic_id).all()
    
    # Enrich with related data
    result = []
    for prescription in prescriptions:
        patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
        
        prescription_dict = {
            **prescription.__dict__,
            "clinic_name": current_user.name,
            "patient_name": patient.name if patient else None,
            "medications": prescription.medications
        }
        result.append(prescription_dict)
    
    return result

# Get a specific prescription
@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Check if user is authorized
    if (current_user.id != prescription.patient_id and 
        current_user.id != prescription.clinic_id and 
        current_user.type != "clinic"):
        raise HTTPException(status_code=403, detail="Not authorized to view this prescription")
    
    # Enrich with related data
    clinic = db.query(Clinic).filter(Clinic.id == prescription.clinic_id).first()
    patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
    
    response = {
        **prescription.__dict__,
        "clinic_name": clinic.name if clinic else None,
        "patient_name": patient.name if patient else None,
        "medications": prescription.medications
    }
    
    return response

# Update a prescription
@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: str,
    prescription_data: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get prescription
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Check if user is authorized
    if current_user.id != prescription.clinic_id or current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to update this prescription")
    
    # Update prescription
    for key, value in prescription_data.dict(exclude_unset=True).items():
        setattr(prescription, key, value)
    
    db.commit()
    db.refresh(prescription)
    
    # Enrich with related data
    clinic = db.query(Clinic).filter(Clinic.id == prescription.clinic_id).first()
    patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
    
    response = {
        **prescription.__dict__,
        "clinic_name": clinic.name if clinic else None,
        "patient_name": patient.name if patient else None,
        "medications": prescription.medications
    }
    
    return response