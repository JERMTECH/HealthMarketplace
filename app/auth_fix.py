"""
Temporary script to fix user authentication type for reward configuration
"""
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.users import User

def fix_admin_user_type():
    """Update admin user type to match exactly what the code is looking for"""
    # Get database session
    db = next(get_db())
    
    # Find admin user
    admin = db.query(User).filter(User.email == "admin@healthcaremarket.com").first()
    
    if admin:
        # Update type to ensure it matches exactly what the code expects
        admin.type = "admin"
        db.commit()
        print(f"Updated admin user type: {admin.type}")
        return True
    else:
        print("Admin user not found")
        return False

if __name__ == "__main__":
    fix_admin_user_type()