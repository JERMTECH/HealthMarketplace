from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
import uuid
import logging # Added logging

from app.database import get_db
from app.models.users import User
from app.models.appointments import Appointment
from app.models.clinics import Clinic, ClinicService # Clinic already imported, User for clinic.user
from app.models.patients import Patient # Patient for patient.user
from app.models.rewards import RewardPoint
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate, # Renamed from AppointmentUpdateStatus for consistency if schema changes
    # AppointmentStats # Not used in current refactoring scope but keep if used elsewhere
)
from app.auth import get_current_active_user

router = APIRouter()
logger = logging.getLogger(__name__) # Added logger

# Helper function to check if user is admin (if not already available globally)
# Assuming this helper is defined or imported appropriately.
# For this refactor, let's define it if not present from a shared module.
def is_admin(user: User):
    admin_types = ['admin', 'administrator', 'system']
    return user.type and user.type.lower() in admin_types


# Get all appointments (admin only)
@router.get("/all", response_model=List[AppointmentResponse])
async def get_all_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")

    appointments = db.query(Appointment).options(
        joinedload(Appointment.patient).joinedload(Patient.user), # patient.user.name
        joinedload(Appointment.clinic).joinedload(Clinic.user),   # clinic.user.name
        joinedload(Appointment.service)
    ).all()
    
    response = []
    for appt in appointments:
        response.append(AppointmentResponse(
            id=appt.id,
            patient_id=appt.patient_id,
            clinic_id=appt.clinic_id,
            service_id=appt.service_id,
            date=str(appt.date), # Ensure string format if model stores as Date object
            time=str(appt.time), # Ensure string format if model stores as Time object
            notes=appt.notes,
            status=appt.status,
            created_at=appt.created_at,
            updated_at=appt.updated_at,
            patient_name=appt.patient.user.name if appt.patient and appt.patient.user else None,
            clinic_name=appt.clinic.user.name if appt.clinic and appt.clinic.user else None, # Assuming clinic name is from User model
            service_name=appt.service.name if appt.service else None
        ))
    return response

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
    
    # Construct AppointmentResponse
    # Clinic name: from clinic.user.name (assuming clinic users store the clinic's public name)
    # or clinic.name if Clinic model has its own name field.
    # Based on previous patterns (e.g. products.py for OrderResponse.clinic_name), it's often clinic.user.name
    # Let's assume Clinic model itself has a 'name' field for the clinic's name for now.
    # If clinic.user.name is the source of truth, that needs to be fetched.
    # For simplicity and consistency with AppointmentResponse schema, let's assume Clinic has a name.
    # If User model should provide clinic name:
    # clinic_user_for_name = db.query(User).filter(User.id == clinic.id).first()
    # clinic_display_name = clinic_user_for_name.name if clinic_user_for_name else clinic.id # Fallback
    
    # Fetching user for clinic name if Clinic model doesn't have a direct name field
    # For this refactor, we'll assume Clinic model has a 'name' field as per existing ClinicService.clinic.name usage.
    # If clinic.user.name is needed, the query for 'clinic' needs to be options(joinedload(Clinic.user))
    
    # For patient_name, current_user.name is correct.
    # For service_name, service.name is correct.
    # For clinic_name, assuming clinic.name (if not, clinic.user.name)
    
    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        clinic_id=appointment.clinic_id,
        service_id=appointment.service_id,
        date=str(appointment.date),
        time=str(appointment.time),
        notes=appointment.notes,
        status=appointment.status,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
        patient_name=current_user.name, # current_user is the patient
        clinic_name=clinic.name, # Assuming Clinic model has a name
        service_name=service.name
    )

# Get patient appointments
@router.get("/patient/{patient_id}", response_model=List[AppointmentResponse])
async def get_patient_appointments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id and current_user.type != "clinic":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these appointments")
    
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).options(
        joinedload(Appointment.clinic).joinedload(Clinic.user), # clinic.user.name for clinic_name
        joinedload(Appointment.service)
    ).all()
    
    response = []
    patient_user_name = current_user.name if current_user.id == patient_id else None
    if not patient_user_name: # If clinic is fetching, get patient's name from DB
        patient_record = db.query(User).filter(User.id == patient_id).first()
        if patient_record:
            patient_user_name = patient_record.name
            
    for appt in appointments:
        response.append(AppointmentResponse(
            id=appt.id,
            patient_id=appt.patient_id,
            clinic_id=appt.clinic_id,
            service_id=appt.service_id,
            date=str(appt.date),
            time=str(appt.time),
            notes=appt.notes,
            status=appt.status,
            created_at=appt.created_at,
            updated_at=appt.updated_at,
            patient_name=patient_user_name, # Name of the patient whose appointments are being fetched
            clinic_name=appt.clinic.user.name if appt.clinic and appt.clinic.user else None, # Assuming clinic name from User model
            service_name=appt.service.name if appt.service else None
        ))
    return response

# Get clinic appointments
@router.get("/clinic/{clinic_id}", response_model=List[AppointmentResponse])
async def get_clinic_appointments(
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != clinic_id and current_user.type != "clinic": # Only clinic itself or another clinic (if admin access for clinics is ever added)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these appointments")
    
    appointments = db.query(Appointment).filter(Appointment.clinic_id == clinic_id).options(
        joinedload(Appointment.patient).joinedload(Patient.user), # patient.user.name for patient_name
        joinedload(Appointment.service)
    ).all()
    
    response = []
    # Clinic name can be derived from current_user if current_user.id == clinic_id
    # Or, if clinic has its own name field, from appt.clinic.name
    # For now, assume current_user's name if it's their clinic.
    # If Clinic model itself has a name field, it would be appt.clinic.name.
    # Using appt.clinic.user.name for consistency with other endpoints needing clinic name.
    
    # To get the clinic's name consistently, especially if an admin is accessing this
    # (though current auth doesn't allow admin for this specific endpoint directly, it's good practice)
    # we should rely on the joinedload data.
    # For this specific route, current_user is the clinic owner.
    clinic_display_name = current_user.name # current_user is the clinic

    for appt in appointments:
        response.append(AppointmentResponse(
            id=appt.id,
            patient_id=appt.patient_id,
            clinic_id=appt.clinic_id,
            service_id=appt.service_id,
            date=str(appt.date),
            time=str(appt.time),
            notes=appt.notes,
            status=appt.status,
            created_at=appt.created_at,
            updated_at=appt.updated_at,
            patient_name=appt.patient.user.name if appt.patient and appt.patient.user else None,
            clinic_name=clinic_display_name, # Name of the clinic whose appointments are being fetched
            service_name=appt.service.name if appt.service else None
        ))
    return response

# Update appointment status
@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: str,
    appointment_data: AppointmentUpdate, # Using AppointmentUpdate which now includes status
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
                    points_earned = int(float(service.price) * 5) # Assuming 5 points per dollar
                
                reward_point = RewardPoint(
                    id=str(uuid.uuid4()),
                    patient_id=appointment.patient_id,
                    points=str(points_earned),
                    description=f"Appointment: {service.name if service else 'Unknown service'}", # Use service name
                    source_id=appointment.id, # Link to appointment
                    type="earned" # Type of reward
                )
                db.add(reward_point)
            except (ValueError, TypeError):
                logger.warning(f"Could not calculate reward points for appointment {appointment.id} due to invalid service price: {service.price}")
    
    db.commit()
    db.refresh(appointment)
    
    # Re-fetch related entities for the response after potential updates
    # Use joinedload for efficiency if these were not already loaded or might have changed
    # However, for constructing response, a simple query is also fine if IDs are known.
    
    # To ensure accurate names, especially if they could change (though not typical for clinic/service names here)
    # or if not loaded initially with appointment object.
    # The appointment object itself is refreshed. Patient/Clinic/Service are static context here.
    
    # For response construction, it's better to query them to ensure data consistency,
    # especially if a more complex setup allowed clinic/service details to change.
    # Or, ensure they are part of the 'appointment' object via relationships after refresh.
    # Simplified: load them again or ensure eager loading on 'appointment' if it's re-queried.
    # For now, let's assume the 'appointment' object has refreshed relationships or we fetch them.
    
    # To populate AppointmentResponse, we need patient_name, clinic_name, service_name.
    # These are best fetched using the IDs from the 'appointment' object.
    
    patient_user = db.query(User).filter(User.id == appointment.patient_id).first()
    # Clinic name from Clinic.user.name or Clinic.name
    # Assuming Clinic model has a 'name' attribute directly or via 'user' relationship
    # For consistency with /all, let's assume clinic.user.name
    clinic_obj = db.query(Clinic).options(joinedload(Clinic.user)).filter(Clinic.id == appointment.clinic_id).first()
    service_obj = db.query(ClinicService).filter(ClinicService.id == appointment.service_id).first()

    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        clinic_id=appointment.clinic_id,
        service_id=appointment.service_id,
        date=str(appointment.date),
        time=str(appointment.time),
        notes=appointment.notes,
        status=appointment.status, # This is the updated status
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
        patient_name=patient_user.name if patient_user else None,
        clinic_name=clinic_obj.user.name if clinic_obj and clinic_obj.user else (clinic_obj.name if clinic_obj else None), # Prioritize user.name if exists
        service_name=service_obj.name if service_obj else None
    )