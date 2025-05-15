# Import models
from app.models.users import User
from app.models.clinics import Clinic, ClinicService
from app.models.patients import Patient
from app.models.appointments import Appointment
from app.models.products import Product, Order, OrderItem
from app.models.prescriptions import Prescription, Medication
from app.models.rewards import RewardPoint, RewardCard, PartnerShop, PartnerShopCategory

# Function to create initial data
def create_initial_data():
    """Create initial data for the healthcare marketplace."""
    # This function has been moved to sample_data.py to avoid circular imports
    from app.sample_data import create_initial_data as create_sample_data
    create_sample_data()