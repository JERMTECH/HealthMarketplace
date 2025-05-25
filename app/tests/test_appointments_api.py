import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, ANY
import uuid
from datetime import datetime, time

from app.main import app # Assuming FastAPI app instance is here
from app.schemas.appointment import AppointmentCreate, AppointmentUpdateStatus
from app.models.users import User
from app.models.patients import Patient
from app.models.clinics import Clinic, ClinicService
from app.models.appointments import Appointment
from app.models.rewards import RewardPoint # For testing reward point creation
from app.auth import get_current_active_user # For overriding

# TestClient instance
client = TestClient(app)

# --- Mock Data ---
MOCK_PATIENT_USER_1 = User(id="patient_user_id_1", type="patient", email="patient1@example.com", name="Patient One", is_active=True)
MOCK_PATIENT_USER_2 = User(id="patient_user_id_2", type="patient", email="patient2@example.com", name="Patient Two", is_active=True)
MOCK_CLINIC_OWNER_USER_1 = User(id="clinic_owner_id_1", type="clinic", email="owner1@example.com", name="Clinic Owner One", is_active=True)
MOCK_CLINIC_OWNER_USER_2 = User(id="clinic_owner_id_2", type="clinic", email="owner2@example.com", name="Clinic Owner Two", is_active=True)
MOCK_ADMIN_USER = User(id="admin_user_id", type="admin", email="admin@example.com", name="Admin User", is_active=True)


MOCK_PATIENT_DB_1 = Patient(id=MOCK_PATIENT_USER_1.id, phone="111", address="Addr1", date_of_birth="1990-01-01")
MOCK_PATIENT_DB_2 = Patient(id=MOCK_PATIENT_USER_2.id, phone="222", address="Addr2", date_of_birth="1992-02-02")

MOCK_CLINIC_DB_1 = Clinic(id=MOCK_CLINIC_OWNER_USER_1.id, name="Clinic One Name from User Model", phone="C1-Phone", address="C1-Addr")
MOCK_CLINIC_DB_2 = Clinic(id=MOCK_CLINIC_OWNER_USER_2.id, name="Clinic Two Name from User Model", phone="C2-Phone", address="C2-Addr")

MOCK_SERVICE_DB_1 = ClinicService(id="service_id_1", clinic_id=MOCK_CLINIC_DB_1.id, name="Service One", price="50.00", duration="30")
MOCK_SERVICE_DB_2 = ClinicService(id="service_id_2", clinic_id=MOCK_CLINIC_DB_1.id, name="Service Two", price="invalid_price", duration="60") # For testing rewards
MOCK_SERVICE_DB_3_NO_PRICE = ClinicService(id="service_id_3", clinic_id=MOCK_CLINIC_DB_1.id, name="Service Three NP", price=None, duration="45")

MOCK_APPOINTMENT_1 = Appointment(
    id="appt_id_1",
    patient_id=MOCK_PATIENT_USER_1.id,
    clinic_id=MOCK_CLINIC_DB_1.id,
    service_id=MOCK_SERVICE_DB_1.id,
    date=datetime.utcnow().date(),
    time=time(10,0),
    status="pending"
)
MOCK_APPOINTMENT_2_FOR_CLINIC_1 = Appointment(
    id="appt_id_2",
    patient_id=MOCK_PATIENT_USER_2.id, # Different patient
    clinic_id=MOCK_CLINIC_DB_1.id,    # Same clinic
    service_id=MOCK_SERVICE_DB_1.id,
    date=datetime.utcnow().date(),
    time=time(11,0),
    status="confirmed"
)

@pytest.fixture
def mock_db_session():
    db = MagicMock(spec=Session)
    query_mock = MagicMock()
    filter_mock = MagicMock()
    
    query_mock.filter.return_value = filter_mock
    filter_mock.first.return_value = None 
    filter_mock.all.return_value = []
    
    db.query.return_value = query_mock
    return db

@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides = {}

def mock_get_current_active_user_dependency(user_to_return: User):
    async def mock_user_dep():
        return user_to_return
    return mock_user_dep

# --- Tests for GET /api/appointments/all ---
def test_get_all_appointments_no_auth_success_with_data(mock_db_session: MagicMock):
    # Mocking the complex query in /all
    # The route queries Appointment, then joins/filters User (for patient_name), Clinic, ClinicService
    mock_appointment_data = [
        (MOCK_APPOINTMENT_1, MOCK_PATIENT_USER_1.name, MOCK_CLINIC_DB_1.name, MOCK_SERVICE_DB_1.name)
    ]
    mock_db_session.query().outerjoin().outerjoin().outerjoin().all.return_value = mock_appointment_data

    response = client.get("/api/appointments/all")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_APPOINTMENT_1.id
    assert data[0]["patient_name"] == MOCK_PATIENT_USER_1.name
    assert data[0]["clinic_name"] == MOCK_CLINIC_DB_1.name # Name from Clinic model
    assert data[0]["service_name"] == MOCK_SERVICE_DB_1.name

def test_get_all_appointments_no_auth_empty_db(mock_db_session: MagicMock):
    mock_db_session.query().outerjoin().outerjoin().outerjoin().all.return_value = []
    response = client.get("/api/appointments/all")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


# --- Tests for POST /api/appointments/ (Create Appointment) ---
APPOINTMENT_CREATE_PAYLOAD = {
    "clinic_id": MOCK_CLINIC_DB_1.id,
    "service_id": MOCK_SERVICE_DB_1.id,
    "date": "2024-12-25", # Ensure valid date format
    "time": "10:00:00"     # Ensure valid time format
}

def test_create_appointment_patient_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_DB_1.id).first.return_value = MOCK_CLINIC_DB_1
    mock_db_session.query(ClinicService).filter(
        ClinicService.id == MOCK_SERVICE_DB_1.id,
        ClinicService.clinic_id == MOCK_CLINIC_DB_1.id
    ).first.return_value = MOCK_SERVICE_DB_1
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1


    response = client.post("/api/appointments/", json=APPOINTMENT_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_201_CREATED # As per route
    
    added_appointment = mock_db_session.add.call_args[0][0]
    assert isinstance(added_appointment, Appointment)
    assert added_appointment.patient_id == MOCK_PATIENT_USER_1.id
    assert added_appointment.status == "pending"
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(added_appointment)

    data = response.json()
    assert data["patient_name"] == MOCK_PATIENT_USER_1.name
    assert data["clinic_name"] == MOCK_CLINIC_DB_1.name
    assert data["service_name"] == MOCK_SERVICE_DB_1.name

def test_create_appointment_non_patient_user_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    response = client.post("/api/appointments/", json=APPOINTMENT_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_create_appointment_clinic_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_DB_1.id).first.return_value = None
    response = client.post("/api/appointments/", json=APPOINTMENT_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_create_appointment_service_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_db_session.query(Clinic).filter(Clinic.id == MOCK_CLINIC_DB_1.id).first.return_value = MOCK_CLINIC_DB_1
    mock_db_session.query(ClinicService).filter(ANY, ANY).first.return_value = None # Service not found
    response = client.post("/api/appointments/", json=APPOINTMENT_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_create_appointment_invalid_payload(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    invalid_payload = {"clinic_id": "test"} # Missing fields
    response = client.post("/api/appointments/", json=invalid_payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for GET /api/appointments/patient/{patient_id} ---
def test_get_patient_appointments_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_appointment_data = [
        (MOCK_APPOINTMENT_1, MOCK_CLINIC_DB_1.name, MOCK_SERVICE_DB_1.name)
    ]
    # Mock the specific query used in this route
    mock_db_session.query(Appointment, Clinic.name, ClinicService.name).select_from(Appointment).join(Clinic).join(ClinicService).filter(Appointment.patient_id == MOCK_PATIENT_USER_1.id).all.return_value = mock_appointment_data
    
    response = client.get(f"/api/appointments/patient/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_APPOINTMENT_1.id

def test_get_patient_appointments_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    mock_appointment_data = [
        (MOCK_APPOINTMENT_1, MOCK_CLINIC_DB_1.name, MOCK_SERVICE_DB_1.name)
    ]
    mock_db_session.query(Appointment, Clinic.name, ClinicService.name).select_from(Appointment).join(Clinic).join(ClinicService).filter(Appointment.patient_id == MOCK_PATIENT_USER_1.id).all.return_value = mock_appointment_data
    
    response = client.get(f"/api/appointments/patient/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK

def test_get_patient_appointments_patient_other_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_2) # Patient 2
    response = client.get(f"/api/appointments/patient/{MOCK_PATIENT_USER_1.id}") # Accessing Patient 1's
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_get_patient_appointments_unauth_type_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_ADMIN_USER) # Admin, not clinic
    response = client.get(f"/api/appointments/patient/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# --- Tests for GET /api/appointments/clinic/{clinic_id} ---
def test_get_clinic_appointments_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    mock_appointment_data = [
        (MOCK_APPOINTMENT_1, MOCK_PATIENT_USER_1.name, MOCK_SERVICE_DB_1.name)
    ]
    mock_db_session.query(Appointment, User.name, ClinicService.name).select_from(Appointment).join(User, User.id == Appointment.patient_id).join(ClinicService).filter(Appointment.clinic_id == MOCK_CLINIC_OWNER_USER_1.id).all.return_value = mock_appointment_data
    
    response = client.get(f"/api/appointments/clinic/{MOCK_CLINIC_OWNER_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_APPOINTMENT_1.id

def test_get_clinic_appointments_other_clinic_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_2) # Clinic 2
    response = client.get(f"/api/appointments/clinic/{MOCK_CLINIC_OWNER_USER_1.id}") # Accessing Clinic 1's
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_get_clinic_appointments_non_clinic_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    response = client.get(f"/api/appointments/clinic/{MOCK_CLINIC_OWNER_USER_1.id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN


# --- Tests for PUT /api/appointments/{appointment_id} ---
def test_update_appointment_status_patient_cancel_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    
    mock_appointment = MagicMock(spec=Appointment)
    mock_appointment.id = MOCK_APPOINTMENT_1.id
    mock_appointment.patient_id = MOCK_PATIENT_USER_1.id
    mock_appointment.clinic_id = MOCK_CLINIC_DB_1.id
    mock_appointment.service_id = MOCK_SERVICE_DB_1.id
    mock_appointment.status = "pending"
    mock_appointment.date = MOCK_APPOINTMENT_1.date
    mock_appointment.time = MOCK_APPOINTMENT_1.time
    
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = mock_appointment
    
    # Mock related objects needed for response construction
    mock_db_session.query(User).filter(User.id == mock_appointment.patient_id).first.return_value = MOCK_PATIENT_USER_1
    mock_db_session.query(Clinic).filter(Clinic.id == mock_appointment.clinic_id).first.return_value = MOCK_CLINIC_DB_1
    mock_db_session.query(ClinicService).filter(ClinicService.id == mock_appointment.service_id).first.return_value = MOCK_SERVICE_DB_1

    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "cancelled"})
    assert response.status_code == status.HTTP_200_OK
    assert mock_appointment.status == "cancelled"
    mock_db_session.commit.assert_called_once()
    data = response.json()
    assert data["status"] == "cancelled"

def test_update_appointment_status_patient_to_confirmed_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = MOCK_APPOINTMENT_1
    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "confirmed"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_appointment_status_clinic_confirm_no_rewards(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    
    mock_appointment = MagicMock(spec=Appointment, id=MOCK_APPOINTMENT_1.id, patient_id=MOCK_PATIENT_USER_1.id, clinic_id=MOCK_CLINIC_OWNER_USER_1.id, service_id=MOCK_SERVICE_DB_3_NO_PRICE.id, status="pending", date=datetime.utcnow().date(), time=time(10,0))
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = mock_appointment
    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_SERVICE_DB_3_NO_PRICE.id).first.return_value = MOCK_SERVICE_DB_3_NO_PRICE # Service with no price
    
    # Mocks for response
    mock_db_session.query(User).filter(User.id == mock_appointment.patient_id).first.return_value = MOCK_PATIENT_USER_1
    mock_db_session.query(Clinic).filter(Clinic.id == mock_appointment.clinic_id).first.return_value = MOCK_CLINIC_DB_1


    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "confirmed"})
    assert response.status_code == status.HTTP_200_OK
    assert mock_appointment.status == "confirmed"
    
    # Check that RewardPoint was NOT added
    reward_point_added = any(isinstance(call_arg[0][0], RewardPoint) for call_arg in mock_db_session.add.call_args_list)
    assert not reward_point_added
    mock_db_session.commit.assert_called_once()

def test_update_appointment_status_clinic_confirm_with_rewards(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    
    mock_appointment = MagicMock(spec=Appointment, id=MOCK_APPOINTMENT_1.id, patient_id=MOCK_PATIENT_USER_1.id, clinic_id=MOCK_CLINIC_OWNER_USER_1.id, service_id=MOCK_SERVICE_DB_1.id, status="pending", date=datetime.utcnow().date(), time=time(10,0))
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = mock_appointment
    mock_db_session.query(ClinicService).filter(ClinicService.id == MOCK_SERVICE_DB_1.id).first.return_value = MOCK_SERVICE_DB_1 # Service with valid price

    # Mocks for response
    mock_db_session.query(User).filter(User.id == mock_appointment.patient_id).first.return_value = MOCK_PATIENT_USER_1
    mock_db_session.query(Clinic).filter(Clinic.id == mock_appointment.clinic_id).first.return_value = MOCK_CLINIC_DB_1

    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "confirmed"})
    assert response.status_code == status.HTTP_200_OK
    assert mock_appointment.status == "confirmed"
    
    # Check that RewardPoint WAS added
    reward_point_added = any(isinstance(call_arg[0][0], RewardPoint) for call_arg in mock_db_session.add.call_args_list)
    assert reward_point_added
    mock_db_session.commit.assert_called_once()

def test_update_appointment_status_clinic_complete_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_OWNER_USER_1)
    mock_appointment = MagicMock(spec=Appointment, id=MOCK_APPOINTMENT_1.id, patient_id=MOCK_PATIENT_USER_1.id, clinic_id=MOCK_CLINIC_OWNER_USER_1.id, service_id=MOCK_SERVICE_DB_1.id, status="confirmed", date=datetime.utcnow().date(), time=time(10,0))
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = mock_appointment
    
    # Mocks for response
    mock_db_session.query(User).filter(User.id == mock_appointment.patient_id).first.return_value = MOCK_PATIENT_USER_1
    mock_db_session.query(Clinic).filter(Clinic.id == mock_appointment.clinic_id).first.return_value = MOCK_CLINIC_DB_1
    mock_db_session.query(ClinicService).filter(ClinicService.id == mock_appointment.service_id).first.return_value = MOCK_SERVICE_DB_1


    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "completed"})
    assert response.status_code == status.HTTP_200_OK
    assert mock_appointment.status == "completed"

def test_update_appointment_status_unauthorized_user(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_2) # Patient 2
    # MOCK_APPOINTMENT_1 belongs to Patient 1 and Clinic 1
    mock_db_session.query(Appointment).filter(Appointment.id == MOCK_APPOINTMENT_1.id).first.return_value = MOCK_APPOINTMENT_1
    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "cancelled"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_update_appointment_status_appointment_not_found(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    mock_db_session.query(Appointment).filter(Appointment.id == "non_existent_appt").first.return_value = None
    response = client.put("/api/appointments/non_existent_appt", json={"status": "cancelled"})
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_update_appointment_status_invalid_status_value(mock_db_session: MagicMock):
    # This should be caught by Pydantic schema validation for AppointmentUpdateStatus
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"status": "making_it_up"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_update_appointment_status_invalid_payload_structure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    response = client.put(f"/api/appointments/{MOCK_APPOINTMENT_1.id}", json={"state": "cancelled"}) # Wrong key
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

```
