from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid
from datetime import datetime

from app.database import get_db
from app.models.users import User
from app.models.rewards import RewardPoint, RewardCard, PartnerShop, PartnerShopCategory
from app.schemas.reward import (
    RewardPointCreate,
    RewardPointResponse,
    RewardCardCreate,
    RewardCardResponse,
    PartnerShopResponse,
    RewardsInfoResponse,
    PatientRewardsResponse
)
from app.auth import get_current_active_user

router = APIRouter()

# Get rewards information
@router.get("/info", response_model=RewardsInfoResponse)
async def get_rewards_info(db: Session = Depends(get_db)):
    # Get partner shops
    partner_shops = db.query(PartnerShop).all()
    
    # For each partner shop, get categories
    shops_with_categories = []
    for shop in partner_shops:
        categories = db.query(PartnerShopCategory).filter(PartnerShopCategory.partner_shop_id == shop.id).all()
        shop_dict = {
            **shop.__dict__,
            "categories": categories
        }
        shops_with_categories.append(shop_dict)
    
    # Return rewards info
    return {
        "earn_rates": {
            "products": 10,  # points per $1
            "services": 5,   # points per $1
            "referral": 500  # flat points for referral
        },
        "redemption_rate": 100,  # 100 points = $1
        "partner_shops": shops_with_categories
    }

# Get patient rewards
@router.get("/patient/{patient_id}", response_model=PatientRewardsResponse)
async def get_patient_rewards(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these rewards")
    
    # Get point transactions
    earned_transactions = db.query(RewardPoint).filter(
        RewardPoint.patient_id == patient_id,
        RewardPoint.type == "earned"
    ).all()
    
    redeemed_transactions = db.query(RewardPoint).filter(
        RewardPoint.patient_id == patient_id,
        RewardPoint.type == "redeemed"
    ).all()
    
    # Manually sum up the points since they are stored as strings
    earned_points = 0
    for transaction in earned_transactions:
        try:
            earned_points += int(transaction.points)
        except (ValueError, TypeError):
            pass  # Skip invalid values
    
    redeemed_points = 0
    for transaction in redeemed_transactions:
        try:
            redeemed_points += int(transaction.points)
        except (ValueError, TypeError):
            pass  # Skip invalid values
    
    total_points = earned_points - redeemed_points
    
    # Get points history
    history = db.query(RewardPoint).filter(
        RewardPoint.patient_id == patient_id
    ).order_by(RewardPoint.created_at.desc()).all()
    
    # Get card information
    card = db.query(RewardCard).filter(RewardCard.patient_id == patient_id).first()
    
    return {
        "total_points": total_points,
        "history": history,
        "card": card
    }

# Request a rewards card
@router.post("/card", response_model=RewardCardResponse)
async def request_rewards_card(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if patient
    if current_user.type != "patient":
        raise HTTPException(status_code=403, detail="Only patients can request rewards cards")
    
    # Check if patient already has a card
    existing_card = db.query(RewardCard).filter(RewardCard.patient_id == current_user.id).first()
    if existing_card:
        return existing_card
    
    # Generate card number
    card_number = generate_card_number()
    
    # Create card
    card = RewardCard(
        id=str(uuid.uuid4()),
        patient_id=current_user.id,
        card_number=card_number,
        issued_date=datetime.now().strftime("%Y-%m-%d"),
        status="active"
    )
    
    db.add(card)
    db.commit()
    db.refresh(card)
    
    return card

# Add reward points
@router.post("/points", response_model=RewardPointResponse)
async def add_reward_points(
    point_data: RewardPointCreate,
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only clinics can add points
    if current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Only clinics can add reward points")
    
    # Create reward point
    reward_point = RewardPoint(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        points=point_data.points,
        description=point_data.description,
        source_id=point_data.source_id,
        type=point_data.type
    )
    
    db.add(reward_point)
    db.commit()
    db.refresh(reward_point)
    
    return reward_point

# Helper function to generate a card number
def generate_card_number():
    # Generate a random 16-digit card number
    import random
    card_number = ""
    for i in range(16):
        card_number += str(random.randint(0, 9))
        if (i + 1) % 4 == 0 and i < 15:
            card_number += "-"
    return card_number
            
# Get partner shops for rewards
@router.get("/partners", response_model=List[PartnerShopResponse])
async def get_partner_shops(db: Session = Depends(get_db)):
    """Get all partner shops where reward points can be redeemed."""
    partner_shops = db.query(PartnerShop).all()
    
    # For each partner shop, get categories
    result = []
    for shop in partner_shops:
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
            "categories": [{"id": cat.id, "name": cat.name} for cat in categories]
        }
        result.append(shop_data)
    
    return result