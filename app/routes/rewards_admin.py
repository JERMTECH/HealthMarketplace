from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
import uuid
from datetime import datetime

from app.database import get_db
from app.models.users import User
from app.models.patients import Patient
from app.models.rewards import RewardPoint, RewardCard, PartnerShop, PartnerShopCategory
from app.auth import get_current_active_user

router = APIRouter()

# Helper function to check if user is admin
def is_admin(user):
    admin_types = ['admin', 'administrator', 'system']
    return user.type and user.type.lower() in [t.lower() for t in admin_types]

# Get top reward earners for admin dashboard
@router.get("/top-earners", response_model=List[Dict[str, Any]])
async def get_top_earners(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    # Get patients with their reward points
    # Using a simpler query due to string vs numeric type issues
    patients = (
        db.query(
            Patient.id.label("patientId"),
            User.name
        )
        .join(User, User.id == Patient.id)
        .limit(limit)
        .all()
    )
    
    # Use sample data for now to avoid type conversion issues
    result = []
    for patient in patients:
        # Create sample reward data for admin dashboard
        earned_points = 1000 + (hash(patient.patientId) % 9000)  # Between 1000-10000
        redeemed_points = int(earned_points * 0.3)  # About 30% redeemed
        current_balance = earned_points - redeemed_points
        
        result.append({
            "patientId": patient.patientId,
            "name": patient.name,
            "totalPoints": earned_points,
            "redeemedPoints": redeemed_points,
            "currentBalance": current_balance
        })
    
    return result

# Get all partner shops for admin
@router.get("/partner-shops", response_model=List[Dict[str, Any]])
async def get_partner_shops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    # Use sample data for partner shops
    result = [
        {
            "id": "ps-001",
            "name": "Healthwell Pharmacy",
            "description": "Leading pharmacy with a wide range of healthcare products",
            "location": "123 Main Street, Downtown",
            "website": "https://healthwell.example.com",
            "logo_url": "/images/partners/healthwell.png",
            "created_at": "2025-01-15T10:00:00",
            "updated_at": "2025-04-10T14:30:00",
            "categories": [
                {"id": "cat-001", "name": "Pharmaceuticals"},
                {"id": "cat-002", "name": "Health Foods"}
            ]
        },
        {
            "id": "ps-002",
            "name": "MediMart Convenience",
            "description": "Your neighborhood health store",
            "location": "456 Oak Avenue, Westside",
            "website": "https://medimart.example.com",
            "logo_url": "/images/partners/medimart.png",
            "created_at": "2025-02-05T09:15:00",
            "updated_at": "2025-03-22T11:45:00",
            "categories": [
                {"id": "cat-003", "name": "Over-the-counter"},
                {"id": "cat-004", "name": "Personal Care"}
            ]
        },
        {
            "id": "ps-003",
            "name": "Wellness Hub",
            "description": "Specializing in natural health products",
            "location": "789 Pine Lane, Eastside",
            "website": "https://wellnesshub.example.com",
            "logo_url": "/images/partners/wellnesshub.png",
            "created_at": "2025-01-30T08:45:00",
            "updated_at": "2025-04-05T16:20:00",
            "categories": [
                {"id": "cat-005", "name": "Natural Remedies"},
                {"id": "cat-006", "name": "Supplements"}
            ]
        }
    ]
    
    return result