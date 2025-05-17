from sqlalchemy.orm import Session
from app.models.users import User
from app.auth import get_password_hash
import uuid

def add_admin_user(db: Session):
    # Check if admin user already exists
    admin = db.query(User).filter(User.email == "admin@healthcaremarket.com").first()
    
    if not admin:
        # Create admin user
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@healthcaremarket.com",
            hashed_password=get_password_hash("admin123"),
            name="System Administrator",
            type="admin",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("Admin user created successfully")
        return admin_user
    else:
        print("Admin user already exists")
        return admin