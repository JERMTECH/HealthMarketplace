from app.models.users import User
from app.models.clinics import Clinic, ClinicService
from app.models.patients import Patient
from app.models.appointments import Appointment
from app.models.products import Product, Order, OrderItem
from app.models.prescriptions import Prescription, Medication
from app.models.rewards import RewardPoint, RewardCard, PartnerShop, PartnerShopCategory
from app.auth import get_password_hash
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal

# Function to create initial data
def create_initial_data():
    """Create initial data for the healthcare marketplace."""
    db = SessionLocal()
    # Check if sample data already exists (by unique clinic email)
    if db.query(User).filter_by(email="cityhealthclinic@example.com").first():
        db.close()
        return
    try:
        # Create clinic users
        clinic_ids = [str(uuid.uuid4()) for _ in range(3)]
        
        clinics = [
            User(
                id=clinic_ids[0],
                email="cityhealthclinic@example.com",
                name="City Health Clinic",
                type="clinic",
                hashed_password=get_password_hash("password123"),
                is_active=True
            ),
            User(
                id=clinic_ids[1],
                email="familymedical@example.com",
                name="Family Medical Center",
                type="clinic",
                hashed_password=get_password_hash("password123"),
                is_active=True
            ),
            User(
                id=clinic_ids[2],
                email="cardiohealth@example.com",
                name="Cardio Health Specialists",
                type="clinic",
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
        ]
        
        db.add_all(clinics)
        
        # Create clinic profiles
        clinic_profiles = [
            Clinic(
                id=clinic_ids[0],
                phone="123-456-7890",
                address="123 Main St, City Center",
                location="City Center",
                specialization="General Practice"
            ),
            Clinic(
                id=clinic_ids[1],
                phone="234-567-8901",
                address="456 Oak Ave, Westside",
                location="Westside",
                specialization="Family Medicine"
            ),
            Clinic(
                id=clinic_ids[2],
                phone="345-678-9012",
                address="789 Heart Blvd, Northend",
                location="Northend",
                specialization="Cardiology"
            )
        ]
        
        db.add_all(clinic_profiles)
        
        # Create clinic services
        services = [
            ClinicService(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[0],
                name="General Consultation",
                description="General health check-up and consultation",
                price="50.00",
                duration="30",
                available="true"
            ),
            ClinicService(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[0],
                name="Vaccination",
                description="Standard vaccinations for adults and children",
                price="35.00",
                duration="15",
                available="true"
            ),
            ClinicService(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[1],
                name="Family Consultation",
                description="Family health assessment and consultation",
                price="75.00",
                duration="45",
                available="true"
            ),
            ClinicService(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[2],
                name="Cardiac Assessment",
                description="Complete cardiac evaluation including ECG",
                price="120.00",
                duration="60",
                available="true"
            )
        ]
        
        db.add_all(services)
        
        # Create patient users
        patient_ids = [str(uuid.uuid4()) for _ in range(2)]
        
        patients = [
            User(
                id=patient_ids[0],
                email="johndoe@example.com",
                name="John Doe",
                type="patient",
                hashed_password=get_password_hash("password123"),
                is_active=True
            ),
            User(
                id=patient_ids[1],
                email="janesmith@example.com",
                name="Jane Smith",
                type="patient",
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
        ]
        
        db.add_all(patients)
        
        # Create patient profiles
        patient_profiles = [
            Patient(
                id=patient_ids[0],
                phone="111-222-3333",
                address="100 Patient St, Cityville",
                date_of_birth="1985-05-15"
            ),
            Patient(
                id=patient_ids[1],
                phone="444-555-6666",
                address="200 Health Ave, Townsburg",
                date_of_birth="1990-10-20"
            )
        ]
        
        db.add_all(patient_profiles)
        
        # Create products
        products = [
            Product(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[0],
                name="Vitamin C Supplements",
                description="Boost your immune system with daily Vitamin C",
                price="12.99",
                category="Supplements",
                in_stock=True
            ),
            Product(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[0],
                name="Digital Thermometer",
                description="Accurate temperature readings in seconds",
                price="24.99",
                category="Medical Devices",
                in_stock=True
            ),
            Product(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[1],
                name="Children's Multivitamins",
                description="Chewable multivitamins for kids aged 4-12",
                price="14.99",
                category="Supplements",
                in_stock=True
            ),
            Product(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[2],
                name="Blood Pressure Monitor",
                description="Home blood pressure monitoring device",
                price="79.99",
                category="Medical Devices",
                in_stock=True
            ),
            Product(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[2],
                name="Omega-3 Fish Oil",
                description="Support heart health with high-quality omega-3",
                price="22.99",
                category="Supplements",
                in_stock=True
            )
        ]
        
        db.add_all(products)
        
        # Create partner shops
        partner_shops = [
            PartnerShop(
                id=str(uuid.uuid4()),
                name="HealthMart Pharmacy",
                description="A complete pharmacy with prescription and OTC medications",
                location="Multiple locations citywide",
                website="https://example.com/healthmart"
            ),
            PartnerShop(
                id=str(uuid.uuid4()),
                name="Wellness Nutrition",
                description="Specialty store for nutritional supplements and health foods",
                location="Downtown & Eastside",
                website="https://example.com/wellness"
            ),
            PartnerShop(
                id=str(uuid.uuid4()),
                name="MediEquip Store",
                description="Medical equipment and mobility aids for home care",
                location="Southside Medical District",
                website="https://example.com/mediequip"
            )
        ]
        
        db.add_all(partner_shops)
        db.flush()
        
        # Create partner shop categories
        shop_categories = []
        for shop in partner_shops:
            if shop.name == "HealthMart Pharmacy":
                categories = ["Pharmacy", "Health Products"]
            elif shop.name == "Wellness Nutrition":
                categories = ["Nutrition", "Supplements"]
            else:
                categories = ["Medical Equipment", "Home Care"]
                
            for category in categories:
                shop_categories.append(
                    PartnerShopCategory(
                        id=str(uuid.uuid4()),
                        partner_shop_id=shop.id,
                        name=category
                    )
                )
        
        db.add_all(shop_categories)
        
        # Create sample appointments (one per clinic)
        appointments = [
            Appointment(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[0],
                patient_id=patient_ids[0],
                service_id=services[0].id,  # General Consultation
                date=(datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                time="10:00",
                status="confirmed",
                notes="First appointment for City Health Clinic."
            ),
            Appointment(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[1],
                patient_id=patient_ids[1],
                service_id=services[2].id,  # Family Consultation
                date=(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
                time="11:00",
                status="pending",
                notes="First appointment for Family Medical Center."
            ),
            Appointment(
                id=str(uuid.uuid4()),
                clinic_id=clinic_ids[2],
                patient_id=patient_ids[0],
                service_id=services[3].id,  # Cardiac Assessment
                date=(datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                time="09:30",
                status="confirmed",
                notes="First appointment for Cardio Health Specialists."
            )
        ]
        db.add_all(appointments)
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error creating initial data: {e}")
    finally:
        db.close()