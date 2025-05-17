from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.users import User
from app.models.appointments import Appointment
from app.models.clinics import Clinic, ClinicService
from app.models.patients import Patient
from app.models.rewards import RewardPoint
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    AppointmentStats
)
from app.auth import get_current_active_user

router = APIRouter()

# Get all appointments (admin only in a real app)
@router.get("/all", response_model=List[AppointmentResponse])
async def get_all_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # In a real app, check if admin
    appointments = db.query(Appointment).all()
    
    # Enrich with related data
    result = []
    for appt in appointments:
        clinic = db.query(Clinic).filter(Clinic.id == appt.clinic_id).first()
        service = db.query(ClinicService).filter(ClinicService.id == appt.service_id).first()
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        
        appt_dict = {
            **appt.__dict__,
            "clinic_name": clinic.name if clinic else None,
            "service_name": service.name if service else None,
            "patient_name": patient.name if patient else None
        }
        result.append(appt_dict)
    
    return result

# Book an appointment
@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if patient
    if current_user.type != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    # Check if clinic exists
    clinic = db.query(Clinic).filter(Clinic.id == appointment_data.clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Check if service exists
    service = db.query(ClinicService).filter(
        ClinicService.id == appointment_data.service_id,
        ClinicService.clinic_id == appointment_data.clinic_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Create appointment
    appointment = Appointment(
        id=str(uuid.uuid4()),
        patient_id=current_user.id,
        clinic_id=appointment_data.clinic_id,
        service_id=appointment_data.service_id,
        date=appointment_data.date,
        time=appointment_data.time,
        notes=appointment_data.notes,
        status="pending"
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Return with additional info
    response = {
        **appointment.__dict__,
        "clinic_name": clinic.name,
        "service_name": service.name,
        "patient_name": current_user.name
    }
    
    return response

# Get patient appointments
@router.get("/patient/{patient_id}", response_model=List[AppointmentResponse])
async def get_patient_appointments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view these appointments")
    
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
    
    # Enrich with related data
    result = []
    for appt in appointments:
        clinic = db.query(Clinic).filter(Clinic.id == appt.clinic_id).first()
        service = db.query(ClinicService).filter(ClinicService.id == appt.service_id).first()
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        
        appt_dict = {
            **appt.__dict__,
            "clinic_name": clinic.name if clinic else None,
            "service_name": service.name if service else None,
            "patient_name": patient.name if patient else None
        }
        result.append(appt_dict)
    
    return result

# Get clinic appointments
@router.get("/clinic/{clinic_id}", response_model=List[AppointmentResponse])
async def get_clinic_appointments(
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != clinic_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view these appointments")
    
    appointments = db.query(Appointment).filter(Appointment.clinic_id == clinic_id).all()
    
    # Enrich with related data
    result = []
    for appt in appointments:
        service = db.query(ClinicService).filter(ClinicService.id == appt.service_id).first()
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        
        appt_dict = {
            **appt.__dict__,
            "clinic_name": current_user.name,
            "service_name": service.name if service else None,
            "patient_name": patient.name if patient else None
        }
        result.append(appt_dict)
    
    return result

# Update appointment status
@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: str,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get appointment
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if user is authorized
    is_patient = current_user.id == appointment.patient_id and current_user.type == "patient"
    is_clinic = current_user.id == appointment.clinic_id and current_user.type == "clinic"
    
    if not (is_patient or is_clinic):
        raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
    
    # Patients can only cancel their appointments
    if is_patient and appointment_data.status and appointment_data.status != "cancelled":
        raise HTTPException(status_code=403, detail="Patients can only cancel appointments")
    
    # Update appointment
    for key, value in appointment_data.dict(exclude_unset=True).items():
        setattr(appointment, key, value)
    
    # If confirmed by clinic, add reward points
    if is_clinic and appointment_data.status == "confirmed":
        # Get service price
        service = db.query(ClinicService).filter(ClinicService.id == appointment.service_id).first()
        
        if service and service.price:
            # Add reward points (5 points per dollar for services)
            try:
                points_earned = int(float(service.price) * 5)
                
                reward_point = RewardPoint(
                    id=str(uuid.uuid4()),
                    patient_id=appointment.patient_id,
                    points=str(points_earned),
                    description=f"Appointment: {service.name if service else 'Unknown service'}",
                    source_id=appointment.id,
                    type="earned"
                )
                
                db.add(reward_point)
            except (ValueError, TypeError):
                # If price is not a valid number, skip reward points
                pass
    
    db.commit()
    db.refresh(appointment)
    
    # Return with additional info
    clinic = db.query(Clinic).filter(Clinic.id == appointment.clinic_id).first()
    service = db.query(ClinicService).filter(ClinicService.id == appointment.service_id).first()
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    
    response = {
        **appointment.__dict__,
        "clinic_name": clinic.name if clinic else None,
        "service_name": service.name if service else None,
        "patient_name": patient.name if patient else None
    }
    
    return response