import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, ANY
import uuid
from datetime import datetime

from app.main import app # Assuming FastAPI app instance is here
from app.schemas.patient import PatientUpdate # PatientResponse is not explicitly defined, route returns dict or Patient model
from app.models.users import User
from app.models.patients import Patient
from app.auth import get_current_active_user # For overriding

# TestClient instance
client = TestClient(app)

# --- Mock Data ---
MOCK_ADMIN_USER = User(id="admin_user_id", type="admin", email="admin@example.com", name="Admin User", is_active=True)
MOCK_PATIENT_USER_1 = User(id="patient_user_id_1", type="patient", email="patient1@example.com", name="Patient One", is_active=True)
MOCK_PATIENT_USER_2 = User(id="patient_user_id_2", type="patient", email="patient2@example.com", name="Patient Two", is_active=True)
MOCK_CLINIC_USER = User(id="clinic_user_id_1", type="clinic", email="clinic1@example.com", name="Clinic User One", is_active=True)

MOCK_PATIENT_1_DB = Patient(id=MOCK_PATIENT_USER_1.id, phone="111222333", address="1 Patient St", date_of_birth="1990-01-01")
MOCK_PATIENT_2_DB = Patient(id=MOCK_PATIENT_USER_2.id, phone="444555666", address="2 Patient Rd", date_of_birth="1992-02-02")

# Combined Patient and User data for /all endpoint
MOCK_PATIENT_1_WITH_USER = (MOCK_PATIENT_1_DB, MOCK_PATIENT_USER_1)
MOCK_PATIENT_2_WITH_USER = (MOCK_PATIENT_2_DB, MOCK_PATIENT_USER_2)


@pytest.fixture
def mock_db_session():
    db = MagicMock(spec=Session)
    query_mock = MagicMock()
    filter_mock = MagicMock()
    join_mock = MagicMock() # For join operations

    query_mock.filter.return_value = filter_mock
    filter_mock.first.return_value = None
    filter_mock.all.return_value = []
    filter_mock.count.return_value = 0 # For /count endpoint
    
    # Setup for join().all()
    query_mock.join.return_value = join_mock
    join_mock.all.return_value = []

    db.query.return_value = query_mock
    return db

@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides = {}

# --- Helper for mocking get_current_active_user ---
def mock_get_current_active_user_dependency(user_to_return: User):
    async def mock_user_dep():
        return user_to_return
    return mock_user_dep


# --- Tests for GET /api/patients/count ---
def test_get_patients_count_admin_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
    mock_db_session.query(Patient).count.return_value = 10

    response = client.get("/api/patients/count")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"count": 10}
    mock_db_session.query(Patient).count.assert_called_once()

def test_get_patients_count_non_admin_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    
    response = client.get("/api/patients/count")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized" in response.json()["detail"]


# --- Tests for GET /api/patients/all ---
def test_get_all_patients_admin_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
    mock_db_session.query(Patient, User).join(User, Patient.id == User.id).all.return_value = [
        MOCK_PATIENT_1_WITH_USER, MOCK_PATIENT_2_WITH_USER
    ]

    response = client.get("/api/patients/all")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == MOCK_PATIENT_USER_1.id
    assert data[0]["name"] == MOCK_PATIENT_USER_1.name
    assert data[0]["email"] == MOCK_PATIENT_USER_1.email
    assert data[0]["phone"] == MOCK_PATIENT_1_DB.phone
    assert "is_active" in data[0] # Check for is_active
    assert data[0]["is_active"] == MOCK_PATIENT_USER_1.is_active

def test_get_all_patients_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER)
    # Ensure the mock tuple includes a User object that has is_active
    mock_patient_with_active_user = (
        MOCK_PATIENT_1_DB, 
        User(id=MOCK_PATIENT_1_DB.id, name="Test User", email="test@example.com", type="patient", is_active=True)
    )
    mock_db_session.query(Patient, User).join(User, Patient.id == User.id).all.return_value = [mock_patient_with_active_user]

    response = client.get("/api/patients/all")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_PATIENT_1_DB.id
    assert "is_active" in data[0]
    assert data[0]["is_active"] is True

def test_get_all_patients_no_data(mock_db_session: MagicMock):
    # This test implicitly ensures no sample data is returned by checking for an empty list.
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
    mock_db_session.query(Patient, User).join(User, Patient.id == User.id).all.return_value = []
    
    response = client.get("/api/patients/all")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []

def test_get_all_patients_failure_patient_user(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    response = client.get("/api/patients/all")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# --- Tests for GET /api/patients/{patient_id} ---
def test_get_patient_by_id_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_1_DB
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1

    response = client.get(f"/api/patients/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == MOCK_PATIENT_USER_1.id
    assert data["name"] == MOCK_PATIENT_USER_1.name
    assert data["phone"] == MOCK_PATIENT_1_DB.phone

def test_get_patient_by_id_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_1_DB
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1

    response = client.get(f"/api/patients/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == MOCK_PATIENT_USER_1.id

def test_get_patient_by_id_patient_accessing_another_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    # Patient 1 trying to access Patient 2's data
    response = client.get(f"/api/patients/{MOCK_PATIENT_USER_2.id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_get_patient_by_id_admin_non_clinic_failure(mock_db_session: MagicMock):
    # Admin user who is not also type 'clinic'
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
    response = client.get(f"/api/patients/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN # Based on current logic

def test_get_patient_by_id_patient_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER) # Clinic can access
    mock_db_session.query(Patient).filter(Patient.id == "non_existent_patient").first.return_value = None
    
    response = client.get("/api/patients/non_existent_patient")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Patient not found" in response.json()["detail"]

def test_get_patient_by_id_user_for_patient_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_1_DB
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = None # User not found
    
    response = client.get(f"/api/patients/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found for patient" in response.json()["detail"]


# --- Tests for PUT /api/patients/{patient_id} ---
PATIENT_UPDATE_PAYLOAD = {"name": "Patient One Updated", "phone": "123456789", "address": "New Address"}

def test_update_patient_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    
    # Mock existing patient and user
    mock_patient_in_db = MagicMock(spec=Patient, id=MOCK_PATIENT_USER_1.id, phone="old_phone", address="old_address", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    # Ensure the mock_user_in_db has all fields expected by PatientResponse (name, email)
    mock_user_in_db = MagicMock(spec=User, id=MOCK_PATIENT_USER_1.id, name="Patient One", email=MOCK_PATIENT_USER_1.email)

    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = mock_patient_in_db
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = mock_user_in_db

    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=PATIENT_UPDATE_PAYLOAD)
    
    assert response.status_code == status.HTTP_200_OK
    # Check if the mock objects were updated
    assert mock_patient_in_db.phone == PATIENT_UPDATE_PAYLOAD["phone"]
    assert mock_patient_in_db.address == PATIENT_UPDATE_PAYLOAD["address"]
    assert mock_user_in_db.name == PATIENT_UPDATE_PAYLOAD["name"]

    mock_db_session.commit.assert_called_once()
    assert mock_db_session.refresh.call_count >= 1 # Called on patient, and user if name changed
    
    # Expect PatientResponse structure
    data = response.json() 
    assert data["id"] == MOCK_PATIENT_USER_1.id
    assert data["name"] == PATIENT_UPDATE_PAYLOAD["name"]
    assert data["email"] == MOCK_PATIENT_USER_1.email # Email should be from user mock
    assert data["phone"] == PATIENT_UPDATE_PAYLOAD["phone"]
    assert "created_at" in data
    assert "updated_at" in data

def test_update_patient_by_admin_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
    
    # Admin updates MOCK_PATIENT_USER_1's data
    mock_patient_target_db = MagicMock(spec=Patient, id=MOCK_PATIENT_USER_1.id, phone="old_phone_admin", address="old_address_admin", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    mock_user_target_db = MagicMock(spec=User, id=MOCK_PATIENT_USER_1.id, name="Patient One Original", email=MOCK_PATIENT_USER_1.email)

    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = mock_patient_target_db
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = mock_user_target_db

    admin_update_payload = {"name": "Patient One Updated by Admin", "phone": "000111222"}
    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=admin_update_payload)

    assert response.status_code == status.HTTP_200_OK
    assert mock_patient_target_db.phone == admin_update_payload["phone"]
    assert mock_user_target_db.name == admin_update_payload["name"]
    mock_db_session.commit.assert_called_once()
    
    data = response.json()
    assert data["name"] == admin_update_payload["name"]
    assert data["phone"] == admin_update_payload["phone"]
    assert data["email"] == MOCK_PATIENT_USER_1.email

def test_update_patient_other_patient_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_2.id}", json=PATIENT_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_patient_clinic_user_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER)
    # Clinic user trying to update patient, should fail as per new logic (only self or admin)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_1_DB
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1
    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=PATIENT_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

# This test is now covered by test_update_patient_by_admin_success
# def test_update_patient_admin_user_failure(mock_db_session: MagicMock):
#     app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER)
#     response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=PATIENT_UPDATE_PAYLOAD)
#     assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_patient_patient_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1) # Could be admin too
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = None # Not found
    
    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=PATIENT_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_update_patient_user_for_patient_not_found_when_name_in_payload(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_patient_in_db = MagicMock(spec=Patient, id=MOCK_PATIENT_USER_1.id)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = mock_patient_in_db
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = None # User not found
    
    payload_with_name = PATIENT_UPDATE_PAYLOAD.copy()
    payload_with_name["name"] = "New Name For NonExistentUser"

    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json=payload_with_name)
    # The check for user happens only if name is in patient_data.
    # If user is not found, it should raise 404
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found for patient" in response.json()["detail"]


def test_update_patient_invalid_payload(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    # Example: date_of_birth expects string, sending int
    response = client.put(f"/api/patients/{MOCK_PATIENT_USER_1.id}", json={"date_of_birth": 19900101}) 
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

```
