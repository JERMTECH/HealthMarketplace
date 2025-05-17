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
    patients = (
        db.query(
            Patient.id.label("patientId"),
            User.name,
            func.sum(RewardPoint.points).label("totalPoints")
        )
        .join(User, User.id == Patient.id)
        .join(RewardPoint, RewardPoint.patient_id == Patient.id)
        .filter(RewardPoint.type == "earned")
        .group_by(Patient.id, User.name)
        .order_by(desc("totalPoints"))
        .limit(limit)
        .all()
    )
    
    # For each patient, calculate redeemed points and current balance
    result = []
    for patient in patients:
        # Get redeemed points
        redeemed_points = db.query(
            func.sum(RewardPoint.points)
        ).filter(
            RewardPoint.patient_id == patient.patientId,
            RewardPoint.type == "redeemed"
        ).scalar() or 0
        
        # Calculate current balance
        current_balance = float(patient.totalPoints) - float(redeemed_points)
        
        result.append({
            "patientId": patient.patientId,
            "name": patient.name,
            "totalPoints": float(patient.totalPoints),
            "redeemedPoints": float(redeemed_points),
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
    
    shops = db.query(PartnerShop).all()
    
    result = []
    for shop in shops:
        categories = db.query(PartnerShopCategory).filter(
            PartnerShopCategory.partner_shop_id == shop.id
        ).all()
        
        shop_data = {
            "id": shop.id,
            "name": shop.name,
            "description": shop.description,
            "location": shop.location,
            "website": shop.website,
            "logo_url": shop.logo_url,
            "created_at": shop.created_at,
            "updated_at": shop.updated_at,
            "categories": categories
        }
        
        result.append(shop_data)
    
    return result