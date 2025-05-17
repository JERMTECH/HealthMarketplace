from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
import uuid
import json
from datetime import datetime

from app.database import get_db
from app.models.users import User
from app.models.products import Product
from app.models.reward_config import RewardConfig, Season
from app.schemas.reward_config import (
    RewardConfigCreate,
    RewardConfigUpdate,
    RewardConfigResponse,
    SeasonCreate,
    SeasonUpdate,
    SeasonResponse,
    RewardCalculationRequest,
    RewardCalculationResponse
)
from app.auth import get_current_active_user

router = APIRouter()

# Helper function to calculate rewards
def calculate_reward_points(
    db: Session,
    product_id: str,
    price: float,
    quantity: int,
    category: str = None
) -> Dict[str, Any]:
    # Get the active reward configuration
    config = db.query(RewardConfig).filter(RewardConfig.is_active == True).first()
    if not config:
        # Use default configuration if none is active
        return {
            "points": int(price * 10 * quantity),
            "base_points": price * 10,
            "seasonal_multiplier": 1.0,
            "category_multiplier": 1.0,
            "calculation_breakdown": {
                "base_rate": 10,
                "price": price,
                "quantity": quantity,
                "note": "Using default configuration"
            }
        }
    
    # Get product details if ID is provided
    product = None
    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product and not category:
            category = product.category
    
    # Parse the rules
    try:
        base_rate = float(config.base_rate)
        rules = json.loads(config.product_category_rules)
    except (ValueError, json.JSONDecodeError):
        # If parsing fails, use defaults
        base_rate = 10.0
        rules = {}
    
    # Get active season (if any)
    season = db.query(Season).filter(Season.is_active == True).first()
    seasonal_multiplier = 1.0
    season_info = "No active season"
    if season:
        try:
            seasonal_multiplier = float(season.multiplier)
            season_info = f"{season.name} (multiplier: {seasonal_multiplier}x)"
        except ValueError:
            pass
    
    # Calculate category multiplier
    category_multiplier = 1.0
    if category and category in rules:
        try:
            category_multiplier = float(rules[category])
        except ValueError:
            pass
    
    # Calculate points
    base_points = price * base_rate
    total_points = base_points * seasonal_multiplier * category_multiplier * quantity
    
    # Create calculation breakdown for transparency
    breakdown = {
        "base_rate": base_rate,
        "price": price,
        "base_points": base_points,
        "season": season_info,
        "seasonal_multiplier": seasonal_multiplier,
        "category": category or "Unknown",
        "category_multiplier": category_multiplier,
        "quantity": quantity,
        "calculation": f"({price} × {base_rate}) × {seasonal_multiplier} × {category_multiplier} × {quantity} = {total_points}"
    }
    
    return {
        "points": int(total_points),  # Convert to integer for final point value
        "base_points": base_points,
        "seasonal_multiplier": seasonal_multiplier,
        "category_multiplier": category_multiplier,
        "calculation_breakdown": breakdown
    }

# Routes for reward configurations

@router.post("/configurations", response_model=RewardConfigResponse)
async def create_reward_configuration(
    config_data: RewardConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Allow admin users (more permissive to ensure functionality)
    admin_types = ["admin", "administrator", "system"]
    if current_user.type not in admin_types:
        # Print user type for debugging
        print(f"User tried to access admin endpoint with type: {current_user.type}")
        raise HTTPException(status_code=403, detail="Only administrators can manage reward configurations")
    
    # If this config is set to active, deactivate all others
    if config_data.is_active:
        db.query(RewardConfig).filter(RewardConfig.is_active == True).update({"is_active": False})
    
    # Create config
    config = RewardConfig(
        id=str(uuid.uuid4()),
        name=config_data.name,
        description=config_data.description,
        is_active=config_data.is_active,
        base_rate=config_data.base_rate,
        season_multiplier=config_data.season_multiplier,
        product_category_rules=config_data.product_category_rules,
        created_by=current_user.id
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return config

@router.get("/configurations", response_model=List[RewardConfigResponse])
async def get_reward_configurations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can view reward configurations")
    
    configs = db.query(RewardConfig).order_by(desc(RewardConfig.is_active), desc(RewardConfig.created_at)).all()
    return configs

@router.get("/configurations/{config_id}", response_model=RewardConfigResponse)
async def get_reward_configuration(
    config_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can view reward configurations")
    
    config = db.query(RewardConfig).filter(RewardConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Reward configuration not found")
    
    return config

@router.put("/configurations/{config_id}", response_model=RewardConfigResponse)
async def update_reward_configuration(
    config_id: str,
    config_data: RewardConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manage reward configurations")
    
    config = db.query(RewardConfig).filter(RewardConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Reward configuration not found")
    
    # Update fields if provided
    if config_data.name is not None:
        config.name = config_data.name
    if config_data.description is not None:
        config.description = config_data.description
    if config_data.base_rate is not None:
        config.base_rate = config_data.base_rate
    if config_data.season_multiplier is not None:
        config.season_multiplier = config_data.season_multiplier
    if config_data.product_category_rules is not None:
        config.product_category_rules = config_data.product_category_rules
    
    # If activating this config, deactivate all others
    if config_data.is_active is not None and config_data.is_active and not config.is_active:
        db.query(RewardConfig).filter(RewardConfig.is_active == True).update({"is_active": False})
        config.is_active = True
    elif config_data.is_active is not None:
        config.is_active = config_data.is_active
    
    db.commit()
    db.refresh(config)
    
    return config

@router.delete("/configurations/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward_configuration(
    config_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manage reward configurations")
    
    config = db.query(RewardConfig).filter(RewardConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Reward configuration not found")
    
    db.delete(config)
    db.commit()
    
    return None

# Routes for seasons

@router.post("/seasons", response_model=SeasonResponse)
async def create_season(
    season_data: SeasonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manage seasons")
    
    # If this season is set to active, deactivate all others
    if season_data.is_active:
        db.query(Season).filter(Season.is_active == True).update({"is_active": False})
    
    # Create season
    season = Season(
        id=str(uuid.uuid4()),
        name=season_data.name,
        start_date=season_data.start_date,
        end_date=season_data.end_date,
        multiplier=season_data.multiplier,
        description=season_data.description,
        is_active=season_data.is_active
    )
    
    db.add(season)
    db.commit()
    db.refresh(season)
    
    return season

@router.get("/seasons", response_model=List[SeasonResponse])
async def get_seasons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can view seasons")
    
    seasons = db.query(Season).order_by(desc(Season.is_active), desc(Season.start_date)).all()
    return seasons

@router.get("/seasons/{season_id}", response_model=SeasonResponse)
async def get_season(
    season_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can view seasons")
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    return season

@router.put("/seasons/{season_id}", response_model=SeasonResponse)
async def update_season(
    season_id: str,
    season_data: SeasonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manage seasons")
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    # Update fields if provided
    if season_data.name is not None:
        season.name = season_data.name
    if season_data.start_date is not None:
        season.start_date = season_data.start_date
    if season_data.end_date is not None:
        season.end_date = season_data.end_date
    if season_data.multiplier is not None:
        season.multiplier = season_data.multiplier
    if season_data.description is not None:
        season.description = season_data.description
    
    # If activating this season, deactivate all others
    if season_data.is_active is not None and season_data.is_active and not season.is_active:
        db.query(Season).filter(Season.is_active == True).update({"is_active": False})
        season.is_active = True
    elif season_data.is_active is not None:
        season.is_active = season_data.is_active
    
    db.commit()
    db.refresh(season)
    
    return season

@router.delete("/seasons/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_season(
    season_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if current_user.type != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manage seasons")
    
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    db.delete(season)
    db.commit()
    
    return None

# Calculate reward points
@router.post("/calculate", response_model=RewardCalculationResponse)
async def calculate_rewards(
    calculation_data: RewardCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = calculate_reward_points(
        db=db,
        product_id=calculation_data.product_id,
        price=calculation_data.price,
        quantity=calculation_data.quantity,
        category=calculation_data.category
    )
    
    return result