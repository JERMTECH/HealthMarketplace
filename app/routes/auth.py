from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.users import User
from app.models.clinics import Clinic
from app.models.patients import Patient
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
)

router = APIRouter()

@router.post("/register", response_model=Token)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user with this email already exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        type=user_data.type,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    
    # Create type-specific profile
    if user_data.type == "clinic":
        db_clinic = Clinic(
            id=user_id,
            phone=user_data.phone,
            address=user_data.address,
            location=user_data.location,
            specialization=user_data.specialization
        )
        db.add(db_clinic)
    elif user_data.type == "patient":
        db_patient = Patient(
            id=user_id,
            phone=user_data.phone,
            address=user_data.address,
            date_of_birth=user_data.date_of_birth
        )
        db.add(db_patient)
    else:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user