from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import uuid

from app.database import get_db
from app.models.users import User
from app.models.clinics import Clinic, ClinicService
from app.schemas.clinic import (
    ClinicResponse,
    ClinicUpdate,
    ClinicServiceCreate,
    ClinicServiceResponse,
    ClinicServiceUpdate
)
from app.auth import get_current_active_user

router = APIRouter()

# Helper function to check if user is admin
def is_admin(user):
    admin_types = ['admin', 'administrator', 'system']
    return user.type and user.type.lower() in [t.lower() for t in admin_types]

# Get clinics count for admin dashboard
@router.get("/count", response_model=Dict[str, int])
async def get_clinics_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    count = db.query(func.count(Clinic.id)).scalar()
    return {"count": count}

# Get all clinics
@router.get("/all") # Consider adding response_model=List[ClinicResponse] or a custom schema
async def get_all_clinics(db: Session = Depends(get_db)):
    clinics = db.query(Clinic).all()
    response_data = []
    
    for clinic in clinics:
        user = db.query(User).filter(User.id == clinic.id).first()
        if user: # Only include clinic if its associated user exists
            clinic_data = {
                "id": clinic.id,
                "name": user.name, # Name from User model
                "email": user.email, # Email from User model
                "phone": clinic.phone,
                "address": clinic.address,
                "location": clinic.location,
                "specialization": clinic.specialization,
                "is_active": user.is_active, # is_active from User model
                "created_at": clinic.created_at.isoformat() if clinic.created_at else None,
                "updated_at": clinic.updated_at.isoformat() if clinic.updated_at else None,
                # Assuming ClinicResponse schema expects a nested user object for user details
                # or the main fields are directly part of ClinicResponse.
                # The current ClinicResponse seems to expect user details flattened.
                # For now, creating a structure that can be mapped by Pydantic if it expects flattened user fields.
                # If ClinicResponse expects a nested user, this needs adjustment.
                # "user": {
                #     "id": user.id,
                #     "name": user.name,
                #     "email": user.email,
                #     "is_active": user.is_active
                # }
                # The provided ClinicResponse schema has name, email directly.
                # It also has `services: List[ClinicServiceResponse]` which this route is not populating.
                # For simplicity, this fix focuses on removing sample data and direct DB query.
                # The original sample data had a nested user, but ClinicResponse doesn't.
            }
            # This structure is closer to what ClinicResponse seems to imply
            # by having 'name' and 'email' at the top level.
            # Let's create a dictionary matching ClinicResponse fields
            # This will require ClinicResponse to be able to handle these fields.
            # The provided ClinicResponse in schemas/clinic.py is:
            # class ClinicResponse(ClinicBase):
            # id: str
            # name: str  <-- from User
            # email: str <-- from User
            # services: List[ClinicServiceResponse] = []
            # created_at: datetime
            # updated_at: Optional[datetime] = None
            # class Config: orm_mode = True
            # So, the constructed dict should be usable by ClinicResponse
            
            response_data.append({
                "id": clinic.id,
                "name": user.name,
                "email": user.email,
                "phone": clinic.phone,
                "address": clinic.address,
                "location": clinic.location,
                "specialization": clinic.specialization,
                "is_active": user.is_active,
                "created_at": clinic.created_at, # Pydantic will format it
                "updated_at": clinic.updated_at, # Pydantic will format it
                "services": [] # Services are not loaded here, default to empty list
            })
            
    return response_data

# Get featured clinics (for homepage)
@router.get("/featured", response_model=List[ClinicResponse])
async def get_featured_clinics(db: Session = Depends(get_db)):
    # In a real app, this might use criteria like ratings, etc.
    # For now, just return the first 3 clinics
    clinics = db.query(Clinic).limit(3).all()
    result = []
    
    for clinic in clinics:
        # Get the corresponding user to get email and name
        user = db.query(User).filter(User.id == clinic.id).first()
        if user:
            clinic_data = {
                **clinic.__dict__,
                "name": user.name,
                "email": user.email,
                "services": clinic.services
            }
            result.append(clinic_data)
    
    return result

# Get a specific clinic
@router.get("/{clinic_id}", response_model=ClinicResponse)
async def get_clinic(clinic_id: str, db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Get the corresponding user to get email and name
    user = db.query(User).filter(User.id == clinic.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Clinic user not found")
    
    clinic_data = {
        **clinic.__dict__,
        "name": user.name,
        "email": user.email,
        "services": clinic.services
    }
    
    return clinic_data

# Update clinic
@router.put("/{clinic_id}", response_model=ClinicResponse)
async def update_clinic(
    clinic_id: str,
    clinic_data: ClinicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    is_clinic_owner = (current_user.type == "clinic" and current_user.id == clinic_id)
    is_system_admin = is_admin(current_user) # is_admin helper is defined in this file

    if not (is_clinic_owner or is_system_admin):
        raise HTTPException(status_code=403, detail="Not authorized to update this clinic")
    
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Update clinic
    update_data = {k: v for k, v in clinic_data.dict(exclude_unset=True).items() 
                 if k not in ["name"]}
    for key, value in update_data.items():
        setattr(clinic, key, value)
    
    # Update user name if it changed
    user = db.query(User).filter(User.id == clinic_id).first()
    if clinic_data.name and user:
        # Update directly in database
        db.query(User).filter(User.id == clinic_id).update({"name": clinic_data.name})
    
    db.commit()
    db.refresh(clinic)
    
    # Create response with both user and clinic data
    user = db.query(User).filter(User.id == clinic_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Clinic user not found")
    
    clinic_data = {
        **clinic.__dict__,
        "name": user.name,
        "email": user.email,
        "services": clinic.services
    }
    #return the updated clinic data
    return clinic_data

# Get clinic services
@router.get("/{clinic_id}/services", response_model=List[ClinicServiceResponse])
async def get_clinic_services(clinic_id: str, db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    services = db.query(ClinicService).filter(ClinicService.clinic_id == clinic_id).all()
    return services

# Add a clinic service
@router.post("/services", response_model=ClinicServiceResponse)
async def add_clinic_service(
    service_data: ClinicServiceCreate, # clinic_id removed from parameters
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized (must be a clinic)
    if current_user.type != "clinic":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clinics can add services")
    
    # Derive clinic_id from the authenticated user
    clinic_id_from_user = current_user.id
    
    # Create/package the service
    service = ClinicService(
        id=str(uuid.uuid4()),
        clinic_id=clinic_id_from_user, # Use derived clinic_id
        name=service_data.name,
        description=service_data.description,
        price=service_data.price,
        duration=service_data.duration,
        available=service_data.available
    )
    
    db.add(service)
    db.commit()
    db.refresh(service)
    
    return service

# Update a clinic service
@router.put("/services/{service_id}", response_model=ClinicServiceResponse)
async def update_clinic_service(
    service_id: str,
    service_data: ClinicServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get service
    service = db.query(ClinicService).filter(ClinicService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if user is authorized
    if current_user.id != service.clinic_id or current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to update this service")
    
    # Update service
    for key, value in service_data.dict(exclude_unset=True).items():
        setattr(service, key, value)
    
    db.commit()
    db.refresh(service)
    
    return service

# Delete a clinic service
@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clinic_service(
    service_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get service
    service = db.query(ClinicService).filter(ClinicService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if user is authorized
    if current_user.id != service.clinic_id or current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to delete this service")
    
    # Delete service
    db.delete(service)
    db.commit()
    
    return None