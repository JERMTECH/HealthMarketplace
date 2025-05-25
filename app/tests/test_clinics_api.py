import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, ANY
import uuid
from datetime import datetime

from app.main import app # Assuming FastAPI app instance is here
from app.schemas.clinic import ClinicResponse, ClinicUpdate, ClinicServiceCreate, ClinicServiceResponse, ClinicServiceUpdate
from app.models.users import User
from app.models.clinics import Clinic, ClinicService

# TestClient instance
client = TestClient(app)

# --- Mock Data ---
MOCK_ADMIN_USER = User(id="admin_user_id", type="admin", email="admin@example.com", name="Admin User", is_active=True)
MOCK_NON_ADMIN_USER = User(id="patient_user_id", type="patient", email="patient@example.com", name="Patient User", is_active=True)
MOCK_CLINIC_OWNER_USER = User(id="clinic_owner_id_1", type="clinic", email="owner1@example.com", name="Clinic Owner One", is_active=True)
MOCK_ANOTHER_CLINIC_OWNER_USER = User(id="clinic_owner_id_2", type="clinic", email="owner2@example.com", name="Clinic Owner Two", is_active=True)

MOCK_CLINIC_1 = Clinic(
    id=MOCK_CLINIC_OWNER_USER.id, 
    phone="111222333", 
    address="1 Clinic St", 
    location="Location A", 
    specialization="General",
    user=MOCK_CLINIC_OWNER_USER # Simulate relationship
)
MOCK_CLINIC_1_USER = MOCK_CLINIC_OWNER_USER # Associated user for MOCK_CLINIC_1

MOCK_CLINIC_2 = Clinic(
    id=MOCK_ANOTHER_CLINIC_OWNER_USER.id, 
    phone="444555666", 
    address="2 Clinic Rd", 
    location="Location B", 
    specialization="Dental",
    user=MOCK_ANOTHER_CLINIC_OWNER_USER
)
MOCK_CLINIC_2_USER = MOCK_ANOTHER_CLINIC_OWNER_USER

MOCK_CLINIC_NO_USER = Clinic(
    id="clinic_no_user_id",
    phone="777888999",
    address="3 NoUser Ave",
    user=None # Simulate missing user
)


MOCK_CLINIC_SERVICE_1 = ClinicService(
    id="service_id_1",
    clinic_id=MOCK_CLINIC_1.id,
    name="Consultation",
    description="General health checkup",
    price="50.00",
    duration="30" # Assuming duration is stored as string e.g., "30 minutes"
)

MOCK_CLINIC_SERVICE_2 = ClinicService(
    id="service_id_2",
    clinic_id=MOCK_CLINIC_1.id, # Also belongs to Clinic 1
    name="Vaccination",
    description="Flu shot",
    price="25.00",
    duration="15"
)


@pytest.fixture
def mock_db_session():
    db = MagicMock(spec=Session)
    # Generic query mock setup
    query_mock = MagicMock()
    filter_mock = MagicMock()
    filter_by_mock = MagicMock() # For filter_by
    
    query_mock.filter.return_value = filter_mock
    query_mock.filter_by.return_value = filter_by_mock # For filter_by
    filter_mock.first.return_value = None # Default to not found
    filter_mock.all.return_value = []   # Default to empty list
    filter_mock.scalar.return_value = 0 # Default count
    filter_by_mock.first.return_value = None # Default for filter_by
    filter_by_mock.all.return_value = []   # Default for filter_by

    db.query.return_value = query_mock
    return db

# Fixture to auto-clear dependency overrides
@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides = {}

# --- Helper for mocking get_current_active_user ---
def mock_get_current_active_user(user_to_return: User):
    async def mock_user_dependency():
        return user_to_return
    return mock_user_dependency

# --- Helper for mocking is_admin ---
def mock_is_admin_dependency(is_admin_value: bool):
    def mock_admin_check(user: User = Depends(MagicMock())): # User dependency here is just for signature matching
        return is_admin_value
    return mock_admin_check


# --- Tests for GET /api/clinics/count ---
def test_get_clinics_count_admin_success(mock_db_session: MagicMock):
    app.dependency_overrides['is_admin'] = lambda: True # Mock is_admin to return True
    mock_db_session.query(Clinic).count.return_value = 5 # Simulate count

    response = client.get("/api/clinics/count")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"count": 5}
    mock_db_session.query(Clinic).count.assert_called_once()

def test_get_clinics_count_non_admin_failure(mock_db_session: MagicMock):
    # This endpoint uses an `is_admin` helper function directly in the route,
    # not as a FastAPI dependency. So we patch it directly if needed or ensure
    # get_current_active_user returns a non-admin and the logic is tested.
    # The prompt says "Mock ... `is_admin` using FastAPI's `app.dependency_overrides`"
    # but `is_admin` in clinics.py is a direct call.
    # For simplicity, we'll assume the is_admin check relies on get_current_active_user.
    app.dependency_overrides[MagicMock(name='get_current_active_user')] = mock_get_current_active_user(MOCK_NON_ADMIN_USER)
    # If `is_admin` was a proper dependency: app.dependency_overrides[is_admin_dependency_name] = lambda: False

    # Re-reading the original product routes, is_admin is a local helper.
    # Let's simulate its behavior by controlling the user type via get_current_active_user.
    # The actual `is_admin` function in `clinics.py` is:
    # def is_admin(user: User = Depends(get_current_active_user)):
    #    return user.type.lower() in ["admin", "administrator", "system"]
    # So, overriding get_current_active_user is the way.
    # Ensure we're using a consistent key for the override if get_current_active_user is imported directly
    from app.auth import get_current_active_user as actual_get_current_active_user # Import to get the actual object used as key
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_NON_ADMIN_USER)

    response = client.get("/api/clinics/count")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized" in response.json()["detail"]


# --- Tests for GET /api/clinics/all ---
def test_get_all_clinics_success_with_data(mock_db_session: MagicMock):
    # Simulate User.clinics relationship if that's how it's structured,
    # or Clinic.user if that's the primary query path.
    # The current route queries Clinic, then gets User via Clinic.id == User.id.
    mock_clinic_1_with_user = MagicMock(spec=Clinic)
    mock_clinic_1_with_user.id = MOCK_CLINIC_1.id
    mock_clinic_1_with_user.phone = MOCK_CLINIC_1.phone
    mock_clinic_1_with_user.address = MOCK_CLINIC_1.address
    # ... other Clinic fields

    mock_user_for_clinic_1 = MagicMock(spec=User)
    mock_user_for_clinic_1.id = MOCK_CLINIC_1_USER.id
    mock_user_for_clinic_1.name = MOCK_CLINIC_1_USER.name
    mock_user_for_clinic_1.email = MOCK_CLINIC_1_USER.email
    # ... other User fields

    mock_db_session.query(Clinic).all.return_value = [mock_clinic_1_with_user]
    mock_db_session.query(User).filter(User.id == mock_clinic_1_with_user.id).first.return_value = mock_user_for_clinic_1

    response = client.get("/api/clinics/all")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == mock_clinic_1_with_user.id
    assert data[0]["name"] == mock_user_for_clinic_1.name # Name comes from User
    assert data[0]["email"] == mock_user_for_clinic_1.email # Email from User
    assert data[0]["phone"] == mock_clinic_1_with_user.phone

def test_get_all_clinics_success_no_data(mock_db_session: MagicMock):
    mock_db_session.query(Clinic).all.return_value = []
    response = client.get("/api/clinics/all")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

def test_get_all_clinics_clinic_missing_user(mock_db_session: MagicMock):
    mock_clinic_no_user_obj = MagicMock(spec=Clinic, id="clinic_no_user_id_123") # other fields
    mock_db_session.query(Clinic).all.return_value = [mock_clinic_no_user_obj]
    # Simulate User query for this clinic's ID returns None
    mock_db_session.query(User).filter(User.id == mock_clinic_no_user_obj.id).first.return_value = None

    response = client.get("/api/clinics/all")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == [] # Clinic is skipped if user not found


# --- Tests for GET /api/clinics/featured ---
def test_get_featured_clinics_success(mock_db_session: MagicMock):
    # Similar to /all, but typically involves different query logic (e.g., a 'featured' flag or specific IDs)
    # The current implementation of /featured in clinics.py seems to be:
    # db.query(Clinic).options(joinedload(Clinic.user)).limit(limit).all()
    # This directly uses Clinic.user relationship.
    
    mock_clinic_1_featured = MagicMock(spec=Clinic)
    mock_clinic_1_featured.id = MOCK_CLINIC_1.id
    mock_clinic_1_featured.phone = MOCK_CLINIC_1.phone
    mock_clinic_1_featured.address = MOCK_CLINIC_1.address
    mock_clinic_1_featured.user = MagicMock(spec=User, id=MOCK_CLINIC_1_USER.id, name=MOCK_CLINIC_1_USER.name, email=MOCK_CLINIC_1_USER.email, type=MOCK_CLINIC_1_USER.type, is_active=True, created_at=datetime.utcnow())
    mock_clinic_1_featured.created_at = datetime.utcnow() # For ClinicResponse

    mock_db_session.query(Clinic).options().limit().all.return_value = [mock_clinic_1_featured]

    response = client.get("/api/clinics/featured?limit=1")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == mock_clinic_1_featured.id
    assert data[0]["name"] == mock_clinic_1_featured.user.name
    assert data[0]["email"] == mock_clinic_1_featured.user.email


def test_get_featured_clinics_no_data(mock_db_session: MagicMock):
    mock_db_session.query(Clinic).options().limit().all.return_value = []
    response = client.get("/api/clinics/featured")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

def test_get_featured_clinics_clinic_user_missing_some_fields(mock_db_session: MagicMock):
    # Test if ClinicResponse handles missing optional fields in User gracefully
    mock_clinic_featured_partial_user = MagicMock(spec=Clinic)
    mock_clinic_featured_partial_user.id = "clinic_partial_user"
    mock_clinic_featured_partial_user.phone = "123"
    mock_clinic_featured_partial_user.address = "Addr"
    # User has required fields for UserResponse (id, name, email, type, is_active)
    # ClinicResponse requires id, name, email, type from User, plus clinic's own fields.
    # If Clinic.user is None, the route skips the clinic.
    mock_clinic_featured_partial_user.user = None 
    mock_clinic_featured_partial_user.created_at = datetime.utcnow()

    mock_db_session.query(Clinic).options().limit().all.return_value = [mock_clinic_featured_partial_user]
    response = client.get("/api/clinics/featured")
    assert response.status_code == status.HTTP_200_OK
    # The clinic with user=None will be skipped by the current list comprehension in the route.
    assert response.json() == []

# Test for GET /api/clinics/all to ensure it doesn't fall back to sample data (implicitly done by other tests)
def test_get_all_clinics_no_fallback_to_sample_data(mock_db_session: MagicMock):
    # If DB query fails (e.g., raises an exception), it should not return sample data.
    # The new implementation re-raises DB errors or returns empty list from DB.
    mock_db_session.query(Clinic).all.side_effect = Exception("DB error")
    
    # Depending on how FastAPI handles exceptions in TestClient, this might be 500 or need try/except.
    # For now, assume TestClient surfaces it. If not, this test would need adjustment.
    # The current implementation of get_all_clinics does not have a try-except for db.query(Clinic).all()
    # So an exception here would lead to a 500.
    with pytest.raises(Exception, match="DB error"):
         client.get("/api/clinics/all")
    # If the route had exception handling that returned a specific HTTP error:
    # response = client.get("/api/clinics/all")
    # assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR 


# --- Tests for GET /api/clinics/{clinic_id} ---
def test_get_clinic_by_id_success(mock_db_session: MagicMock):
    # Ensure the mock_clinic has services attribute for ClinicResponse
    mock_clinic = MagicMock(spec=Clinic, id=MOCK_CLINIC_1.id, phone="123", address="Street", created_at=datetime.utcnow(), services=[])
    mock_user = MagicMock(spec=User, id=MOCK_CLINIC_1.id, name="Clinic User", email="clinic@example.com", type="clinic", is_active=True, created_at=datetime.utcnow())
    
    # Query for Clinic, then User
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_1.id).first.return_value = mock_clinic
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_1.id).first.return_value = mock_user

    response = client.get(f"/api/clinics/{MOCK_CLINIC_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == MOCK_CLINIC_1.id
    assert data["name"] == mock_user.name
    assert data["email"] == mock_user.email
    assert "services" in data # Check services key is present

def test_get_clinic_by_id_clinic_not_found(mock_db_session: MagicMock):
    mock_db_session.query(Clinic).filter(Clinic.id == "non_existent_id").first.return_value = None
    response = client.get("/api/clinics/non_existent_id")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Clinic not found" in response.json()["detail"]

def test_get_clinic_by_id_user_for_clinic_not_found(mock_db_session: MagicMock):
    mock_clinic = MagicMock(spec=Clinic, id=MOCK_CLINIC_1.id)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_1.id).first.return_value = mock_clinic
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_1.id).first.return_value = None # User not found

    response = client.get(f"/api/clinics/{MOCK_CLINIC_1.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found for clinic" in response.json()["detail"]


# --- Tests for PUT /api/clinics/{clinic_id} ---
CLINIC_UPDATE_PAYLOAD = {"phone": "999888777", "address": "Updated Address", "name": "Updated Clinic Name"}

def test_update_clinic_by_owner_success(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    
    # Mock existing clinic and its user
    # The route queries Clinic, then its User relationship
    mock_existing_clinic = MagicMock(spec=Clinic)
    mock_existing_clinic.id = MOCK_CLINIC_OWNER_USER.id # Clinic ID matches owner ID
    mock_existing_clinic.phone = MOCK_CLINIC_1.phone
    mock_existing_clinic.address = MOCK_CLINIC_1.address
    mock_existing_clinic.user = MOCK_CLINIC_OWNER_USER # User relationship
    mock_existing_clinic.created_at = datetime.utcnow()

    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_OWNER_USER.id).first.return_value = mock_existing_clinic

    response = client.put(f"/api/clinics/{MOCK_CLINIC_OWNER_USER.id}", json=CLINIC_UPDATE_PAYLOAD)
    
    assert response.status_code == status.HTTP_200_OK
    # Check if the mock_existing_clinic attributes were updated
    assert mock_existing_clinic.phone == CLINIC_UPDATE_PAYLOAD["phone"]
    assert mock_existing_clinic.address == CLINIC_UPDATE_PAYLOAD["address"]
    # User name update is also checked via mock_user_for_clinic.name
    
    # Check that User model was queried and updated for name
    mock_user_for_clinic = MOCK_CLINIC_OWNER_USER # In this case, clinic.user is the user
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_OWNER_USER.id).first.return_value = mock_user_for_clinic
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_OWNER_USER.id).update.assert_called_once_with({"name": CLINIC_UPDATE_PAYLOAD["name"]})

    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_existing_clinic)
    
    data = response.json()
    assert data["phone"] == CLINIC_UPDATE_PAYLOAD["phone"]
    assert data["name"] == CLINIC_UPDATE_PAYLOAD["name"] # Check updated name in response
    assert data["id"] == MOCK_CLINIC_OWNER_USER.id

def test_update_clinic_by_admin_success(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_ADMIN_USER)

    mock_target_clinic_owner_user = MagicMock(spec=User, id=MOCK_CLINIC_1.id, name=MOCK_CLINIC_1_USER.name, email=MOCK_CLINIC_1_USER.email)
    mock_target_clinic = MagicMock(spec=Clinic)
    mock_target_clinic.id = MOCK_CLINIC_1.id
    mock_target_clinic.phone = MOCK_CLINIC_1.phone
    mock_target_clinic.address = MOCK_CLINIC_1.address
    mock_target_clinic.user = mock_target_clinic_owner_user # User relationship
    mock_target_clinic.created_at = datetime.utcnow()


    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_1.id).first.return_value = mock_target_clinic
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_1.id).first.return_value = mock_target_clinic_owner_user


    response = client.put(f"/api/clinics/{MOCK_CLINIC_1.id}", json=CLINIC_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_200_OK
    assert mock_target_clinic.phone == CLINIC_UPDATE_PAYLOAD["phone"]
    mock_db_session.query(User).filter(User.id == MOCK_CLINIC_1.id).update.assert_called_once_with({"name": CLINIC_UPDATE_PAYLOAD["name"]})
    mock_db_session.commit.assert_called_once()
    data = response.json()
    assert data["name"] == CLINIC_UPDATE_PAYLOAD["name"]


def test_update_clinic_not_authorized_non_owner_non_admin(mock_db_session: MagicMock):
    # Current user is MOCK_ANOTHER_CLINIC_OWNER_USER, trying to update MOCK_CLINIC_OWNER_USER's clinic
    # And MOCK_ANOTHER_CLINIC_OWNER_USER is not an admin
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_ANOTHER_CLINIC_OWNER_USER)
    
    
    # DB returns the clinic being targeted for update
    mock_clinic_to_update = MagicMock(spec=Clinic, id=MOCK_CLINIC_OWNER_USER.id, user=MOCK_CLINIC_OWNER_USER)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_OWNER_USER.id).first.return_value = mock_clinic_to_update

    response = client.put(f"/api/clinics/{MOCK_CLINIC_OWNER_USER.id}", json=CLINIC_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized to update this clinic" in response.json()["detail"]

def test_update_clinic_not_authorized_wrong_type(mock_db_session: MagicMock): # e.g. patient user
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_NON_ADMIN_USER) # User is patient
    
    mock_clinic_to_update = MagicMock(spec=Clinic, id=MOCK_CLINIC_OWNER_USER.id, user=MOCK_CLINIC_OWNER_USER)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_OWNER_USER.id).first.return_value = mock_clinic_to_update

    response = client.put(f"/api/clinics/{MOCK_CLINIC_OWNER_USER.id}", json=CLINIC_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_clinic_clinic_not_found(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_OWNER_USER.id).first.return_value = None # Not found
    
    response = client.put(f"/api/clinics/{MOCK_CLINIC_OWNER_USER.id}", json=CLINIC_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_update_clinic_invalid_payload(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    response = client.put(f"/api/clinics/{MOCK_CLINIC_OWNER_USER.id}", json={"phone": 12345}) # Invalid type for phone (expect string)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for GET /api/clinics/{clinic_id}/services ---
def test_get_clinic_services_success(mock_db_session: MagicMock):
    mock_clinic = MagicMock(spec=Clinic, id=MOCK_CLINIC_1.id)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_1.id).first.return_value = mock_clinic
    
    # Simulate ClinicService query for that clinic_id
    mock_services = [
        MagicMock(spec=ClinicService, id="s1", name="Service 1", price="10", clinic_id=MOCK_CLINIC_1.id, created_at=datetime.utcnow()),
        MagicMock(spec=ClinicService, id="s2", name="Service 2", price="20", clinic_id=MOCK_CLINIC_1.id, created_at=datetime.utcnow())
    ]
    mock_db_session.query(ClinicService).filter(ClinicService.clinic_id == MOCK_CLINIC_1.id).all.return_value = mock_services

    response = client.get(f"/api/clinics/{MOCK_CLINIC_1.id}/services")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Service 1"

def test_get_clinic_services_no_services(mock_db_session: MagicMock):
    mock_clinic = MagicMock(spec=Clinic, id=MOCK_CLINIC_1.id)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_1.id).first.return_value = mock_clinic
    mock_db_session.query(ClinicService).filter(ClinicService.clinic_id == MOCK_CLINIC_1.id).all.return_value = []

    response = client.get(f"/api/clinics/{MOCK_CLINIC_1.id}/services")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

def test_get_clinic_services_clinic_not_found(mock_db_session: MagicMock):
    mock_db_session.query(Clinic).filter(Clinic.id == "non_existent_clinic").first.return_value = None
    response = client.get("/api/clinics/non_existent_clinic/services")
    assert response.status_code == status.HTTP_404_NOT_FOUND


# --- Tests for POST /api/clinics/services (Add Clinic Service) ---
# SERVICE_CREATE_PAYLOAD no longer needs clinic_id as it's derived from current_user
SERVICE_CREATE_PAYLOAD_NO_CLINIC_ID = {"name": "New Service", "price": "100", "description": "Desc", "duration": "60", "available": True}

def test_add_clinic_service_success(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    
    response = client.post("/api/clinics/services", json=SERVICE_CREATE_PAYLOAD_NO_CLINIC_ID)
    assert response.status_code == status.HTTP_200_OK 

    added_service = mock_db_session.add.call_args[0][0]
    assert isinstance(added_service, ClinicService)
    assert added_service.name == SERVICE_CREATE_PAYLOAD_NO_CLINIC_ID["name"]
    assert added_service.clinic_id == MOCK_CLINIC_OWNER_USER.id # Derived from current_user
    
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(added_service)
    
    data = response.json()
    assert data["name"] == SERVICE_CREATE_PAYLOAD_NO_CLINIC_ID["name"]
    assert data["clinic_id"] == MOCK_CLINIC_OWNER_USER.id

def test_add_clinic_service_not_clinic_user(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_NON_ADMIN_USER) # Patient user
    response = client.post("/api/clinics/services", json=SERVICE_CREATE_PAYLOAD_NO_CLINIC_ID)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Only clinics can add services"

# This test is no longer relevant as clinic_id is not part of payload to mismatch
# def test_add_clinic_service_clinic_id_mismatch(mock_db_session: MagicMock):
#     app.dependency_overrides[client.app.dependency_overrides.get('get_current_active_user', get_current_active_user)] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
#     payload_with_wrong_clinic_id = {**SERVICE_CREATE_PAYLOAD, "clinic_id": "some_other_clinic_id"}
#     response = client.post("/api/clinics/services", json=payload_with_wrong_clinic_id)
#     assert response.status_code == status.HTTP_403_FORBIDDEN

def test_add_clinic_service_invalid_payload(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    response = client.post("/api/clinics/services", json={"name": "Only Name"}) # Missing other required fields like price
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for PUT /api/clinics/services/{service_id} ---
SERVICE_UPDATE_PAYLOAD = {"name": "Updated Service Name", "price": "120.00"}

def test_update_clinic_service_success(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    
    mock_existing_service = MagicMock(spec=ClinicService)
    mock_existing_service.id = MOCK_CLINIC_SERVICE_1.id
    mock_existing_service.clinic_id = MOCK_CLINIC_OWNER_USER.id # Belongs to current user
    mock_existing_service.name = MOCK_CLINIC_SERVICE_1.name
    mock_existing_service.price = MOCK_CLINIC_SERVICE_1.price
    mock_existing_service.created_at = datetime.utcnow()

    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_CLINIC_SERVICE_1.id).first.return_value = mock_existing_service

    response = client.put(f"/api/clinics/services/{MOCK_CLINIC_SERVICE_1.id}", json=SERVICE_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_200_OK
    
    assert mock_existing_service.name == SERVICE_UPDATE_PAYLOAD["name"]
    assert mock_existing_service.price == SERVICE_UPDATE_PAYLOAD["price"]
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_existing_service)
    
    data = response.json()
    assert data["name"] == SERVICE_UPDATE_PAYLOAD["name"]

def test_update_clinic_service_not_owner(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_ANOTHER_CLINIC_OWNER_USER)
    
    mock_existing_service = MagicMock(spec=ClinicService, id=MOCK_CLINIC_SERVICE_1.id, clinic_id=MOCK_CLINIC_OWNER_USER.id) # Belongs to different clinic
    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_CLINIC_SERVICE_1.id).first.return_value = mock_existing_service
    
    response = client.put(f"/api/clinics/services/{MOCK_CLINIC_SERVICE_1.id}", json=SERVICE_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_clinic_service_not_found(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    mock_db_session.query(ClinicService).filter(ClinicService.id == "non_existent_service").first.return_value = None
    
    response = client.put("/api/clinics/services/non_existent_service", json=SERVICE_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_update_clinic_service_invalid_payload(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    response = client.put(f"/api/clinics/services/{MOCK_CLINIC_SERVICE_1.id}", json={"price": True}) # Invalid type
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for DELETE /api/clinics/services/{service_id} ---
def test_delete_clinic_service_success(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    
    mock_existing_service = MagicMock(spec=ClinicService, id=MOCK_CLINIC_SERVICE_1.id, clinic_id=MOCK_CLINIC_OWNER_USER.id)
    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_CLINIC_SERVICE_1.id).first.return_value = mock_existing_service

    response = client.delete(f"/api/clinics/services/{MOCK_CLINIC_SERVICE_1.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    mock_db_session.delete.assert_called_once_with(mock_existing_service)
    mock_db_session.commit.assert_called_once()

def test_delete_clinic_service_not_owner(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_ANOTHER_CLINIC_OWNER_USER)
    
    mock_existing_service = MagicMock(spec=ClinicService, id=MOCK_CLINIC_SERVICE_1.id, clinic_id=MOCK_CLINIC_OWNER_USER.id)
    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_CLINIC_SERVICE_1.id).first.return_value = mock_existing_service
    
    response = client.delete(f"/api/clinics/services/{MOCK_CLINIC_SERVICE_1.id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_delete_clinic_service_not_found(mock_db_session: MagicMock):
    from app.auth import get_current_active_user as actual_get_current_active_user
    app.dependency_overrides[actual_get_current_active_user] = mock_get_current_active_user(MOCK_CLINIC_OWNER_USER)
    mock_db_session.query(ClinicService).filter(ClinicService.id == "non_existent_service").first.return_value = None
    
    response = client.delete("/api/clinics/services/non_existent_service")
    assert response.status_code == status.HTTP_404_NOT_FOUND

```
