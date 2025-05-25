import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, ANY, call
import uuid
from datetime import datetime, date

from app.main import app # Assuming FastAPI app instance is here
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdate, MedicationCreate
from app.models.users import User
from app.models.patients import Patient
from app.models.clinics import Clinic
from app.models.prescriptions import Prescription, Medication
from app.auth import get_current_active_user # For overriding

# TestClient instance
client = TestClient(app)

# --- Mock Data ---
MOCK_PATIENT_USER_1 = User(id="patient_user_id_1", type="patient", email="patient1@example.com", name="Patient One", is_active=True)
MOCK_PATIENT_USER_2 = User(id="patient_user_id_2", type="patient", email="patient2@example.com", name="Patient Two", is_active=True)
MOCK_CLINIC_USER_1 = User(id="clinic_owner_id_1", type="clinic", email="owner1@example.com", name="Clinic Owner One", is_active=True)
MOCK_CLINIC_USER_2 = User(id="clinic_owner_id_2", type="clinic", email="owner2@example.com", name="Clinic Owner Two", is_active=True)
MOCK_ADMIN_USER = User(id="admin_user_id", type="admin", email="admin@example.com", name="Admin User", is_active=True) # Though not used by current auth logic

MOCK_PATIENT_DB_1 = Patient(id=MOCK_PATIENT_USER_1.id, phone="111", address="Addr1", date_of_birth="1990-01-01")
MOCK_PATIENT_DB_2 = Patient(id=MOCK_PATIENT_USER_2.id, phone="222", address="Addr2", date_of_birth="1992-02-02")

MOCK_CLINIC_DB_1 = Clinic(id=MOCK_CLINIC_USER_1.id, name="Clinic One Name", phone="C1-Phone", address="C1-Addr") # Assuming Clinic model has 'name'
MOCK_CLINIC_DB_2 = Clinic(id=MOCK_CLINIC_USER_2.id, name="Clinic Two Name", phone="C2-Phone", address="C2-Addr")

MOCK_MEDICATION_1_DATA = {"name": "Med A", "dosage": "10mg", "frequency": "daily", "duration_days": 30}
MOCK_MEDICATION_2_DATA = {"name": "Med B", "dosage": "5ml", "frequency": "twice daily", "duration_days": 14}

MOCK_PRESCRIPTION_1 = Prescription(
    id="presc_id_1",
    patient_id=MOCK_PATIENT_USER_1.id,
    clinic_id=MOCK_CLINIC_USER_1.id,
    issue_date=date(2024, 1, 15),
    notes="Test prescription 1 notes"
)
# Simulate medications relationship for MOCK_PRESCRIPTION_1
MOCK_PRESCRIPTION_1.medications = [
    Medication(id="med_id_1a", prescription_id=MOCK_PRESCRIPTION_1.id, **MOCK_MEDICATION_1_DATA),
    Medication(id="med_id_1b", prescription_id=MOCK_PRESCRIPTION_1.id, **MOCK_MEDICATION_2_DATA)
]

MOCK_PRESCRIPTION_2_FOR_PATIENT_1 = Prescription(
    id="presc_id_2",
    patient_id=MOCK_PATIENT_USER_1.id, # Same patient, different clinic
    clinic_id=MOCK_CLINIC_USER_2.id,
    issue_date=date(2024, 2, 1),
    notes="Test prescription 2 notes"
)
MOCK_PRESCRIPTION_2_FOR_PATIENT_1.medications = [
    Medication(id="med_id_2a", prescription_id=MOCK_PRESCRIPTION_2_FOR_PATIENT_1.id, name="Med C", dosage="1tab", frequency="daily", duration_days=7)
]

@pytest.fixture
def mock_db_session():
    db = MagicMock(spec=Session)
    query_mock = MagicMock()
    filter_mock = MagicMock()
    options_mock = MagicMock() # For joinedload options

    query_mock.filter.return_value = filter_mock
    query_mock.options.return_value = options_mock # query().options()
    options_mock.filter.return_value = filter_mock # query().options().filter()
    
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


# --- Tests for GET /api/prescriptions/all ---
def test_get_all_prescriptions_success_with_data(mock_db_session: MagicMock):
    # Mock the query with joinedload
    mock_prescription_1_for_all = MagicMock(spec=Prescription)
    mock_prescription_1_for_all.id = MOCK_PRESCRIPTION_1.id
    mock_prescription_1_for_all.issue_date = MOCK_PRESCRIPTION_1.issue_date
    mock_prescription_1_for_all.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_prescription_1_for_all.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name)) # Assuming clinic name from User

    mock_db_session.query(Prescription).options().all.return_value = [mock_prescription_1_for_all]

    response = client.get("/api/prescriptions/all")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_PRESCRIPTION_1.id
    assert data[0]["patient_name"] == MOCK_PATIENT_USER_1.name
    assert data[0]["clinic_name"] == MOCK_CLINIC_USER_1.name # Adjusted to match actual mock

def test_get_all_prescriptions_empty_db(mock_db_session: MagicMock):
    mock_db_session.query(Prescription).options().all.return_value = []
    response = client.get("/api/prescriptions/all")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


# --- Tests for POST /api/prescriptions/ (Create Prescription) ---
PRESCRIPTION_CREATE_PAYLOAD = {
    "patient_id": MOCK_PATIENT_USER_1.id,
    "issue_date": "2024-07-28",
    "notes": "Take with food.",
    "medications": [MOCK_MEDICATION_1_DATA, MOCK_MEDICATION_2_DATA]
}

def test_create_prescription_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_DB_1
    # Mock for patient.user.name needed for response construction
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1


    response = client.post("/api/prescriptions/", json=PRESCRIPTION_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_200_OK # Current route returns 200
    
    # Check Prescription object added
    prescription_added = next(arg[0] for arg in mock_db_session.add.call_args_list if isinstance(arg[0], Prescription))
    assert prescription_added.patient_id == MOCK_PATIENT_USER_1.id
    assert prescription_added.clinic_id == MOCK_CLINIC_USER_1.id
    assert prescription_added.notes == PRESCRIPTION_CREATE_PAYLOAD["notes"]
    
    # Check Medication objects added
    medications_added = [arg[0] for arg in mock_db_session.add.call_args_list if isinstance(arg[0], Medication)]
    assert len(medications_added) == 2
    assert medications_added[0].name == MOCK_MEDICATION_1_DATA["name"]
    assert medications_added[1].dosage == MOCK_MEDICATION_2_DATA["dosage"]
    
    mock_db_session.flush.assert_called_once() # Before adding medications
    mock_db_session.commit.assert_called_once() # After all medications
    mock_db_session.refresh.assert_called_once_with(prescription_added)

    data = response.json()
    assert data["patient_name"] == MOCK_PATIENT_USER_1.name
    assert data["clinic_name"] == MOCK_CLINIC_USER_1.name # From current_user
    assert len(data["medications"]) == 2
    assert data["medications"][0]["name"] == MOCK_MEDICATION_1_DATA["name"]

def test_create_prescription_non_clinic_user_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1) # Patient user
    response = client.post("/api/prescriptions/", json=PRESCRIPTION_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_create_prescription_patient_not_found_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    mock_db_session.query(Patient).filter(Patient.id == MOCK_PATIENT_USER_1.id).first.return_value = None # Patient not found
    response = client.post("/api/prescriptions/", json=PRESCRIPTION_CREATE_PAYLOAD)
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_create_prescription_invalid_payload_failure(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    invalid_payload = {"patient_id": "test"} # Missing fields
    response = client.post("/api/prescriptions/", json=invalid_payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for GET /api/prescriptions/patient/{patient_id} ---
def test_get_patient_prescriptions_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    # Mock the Prescription query with joinedload for medications
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name)) # For clinic_name
    
    mock_db_session.query(Prescription).options().filter().all.return_value = [mock_presc_1_with_meds]
    
    response = client.get(f"/api/prescriptions/patient/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_PRESCRIPTION_1.id
    assert data[0]["patient_name"] == MOCK_PATIENT_USER_1.name # From current_user
    assert data[0]["clinic_name"] == MOCK_CLINIC_USER_1.name
    assert len(data[0]["medications"]) == len(MOCK_PRESCRIPTION_1.medications)

def test_get_patient_prescriptions_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))
    # For patient_name when clinic is fetching
    mock_db_session.query(User).filter(User.id == MOCK_PATIENT_USER_1.id).first.return_value = MOCK_PATIENT_USER_1

    mock_db_session.query(Prescription).options().filter().all.return_value = [mock_presc_1_with_meds]
    
    response = client.get(f"/api/prescriptions/patient/{MOCK_PATIENT_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()[0]["patient_name"] == MOCK_PATIENT_USER_1.name


# --- Tests for GET /api/prescriptions/clinic/{clinic_id} ---
def test_get_clinic_prescriptions_self_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name)) # For patient_name
    
    mock_db_session.query(Prescription).options().filter().all.return_value = [mock_presc_1_with_meds]
    
    response = client.get(f"/api/prescriptions/clinic/{MOCK_CLINIC_USER_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == MOCK_PRESCRIPTION_1.id
    assert data[0]["clinic_name"] == MOCK_CLINIC_USER_1.name # From current_user
    assert data[0]["patient_name"] == MOCK_PATIENT_USER_1.name


# --- Tests for GET /api/prescriptions/{prescription_id} ---
def test_get_prescription_by_id_patient_owner_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_PATIENT_USER_1)
    
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_presc_1_with_meds.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))
    
    mock_db_session.query(Prescription).options().filter().first.return_value = mock_presc_1_with_meds
    
    response = client.get(f"/api/prescriptions/{MOCK_PRESCRIPTION_1.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == MOCK_PRESCRIPTION_1.id
    assert data["patient_name"] == MOCK_PATIENT_USER_1.name

def test_get_prescription_by_id_issuing_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1) # Clinic that issued it
    
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_presc_1_with_meds.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))
    mock_db_session.query(Prescription).options().filter().first.return_value = mock_presc_1_with_meds
    
    response = client.get(f"/api/prescriptions/{MOCK_PRESCRIPTION_1.id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["clinic_name"] == MOCK_CLINIC_USER_1.name

def test_get_prescription_by_id_any_clinic_user_current_behavior(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_2) # Different clinic
    
    mock_presc_1_with_meds = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__) # Belongs to Clinic 1
    mock_presc_1_with_meds.medications = MOCK_PRESCRIPTION_1.medications
    mock_presc_1_with_meds.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_presc_1_with_meds.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))
    mock_db_session.query(Prescription).options().filter().first.return_value = mock_presc_1_with_meds
    
    response = client.get(f"/api/prescriptions/{MOCK_PRESCRIPTION_1.id}")
    assert response.status_code == status.HTTP_200_OK # Currently allows any clinic


# --- Tests for PUT /api/prescriptions/{prescription_id} ---
PRESCRIPTION_UPDATE_PAYLOAD = {"notes": "Updated notes for prescription."}

def test_update_prescription_issuing_clinic_success(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    
    mock_prescription = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    mock_prescription.medications = MOCK_PRESCRIPTION_1.medications # Ensure medications are attached for response
    mock_prescription.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_prescription.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))
    
    mock_db_session.query(Prescription).options().filter().first.return_value = mock_prescription
    
    response = client.put(f"/api/prescriptions/{MOCK_PRESCRIPTION_1.id}", json=PRESCRIPTION_UPDATE_PAYLOAD)
    assert response.status_code == status.HTTP_200_OK
    assert mock_prescription.notes == PRESCRIPTION_UPDATE_PAYLOAD["notes"]
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_prescription)
    
    data = response.json()
    assert data["notes"] == PRESCRIPTION_UPDATE_PAYLOAD["notes"]
    assert len(data["medications"]) == len(MOCK_PRESCRIPTION_1.medications) # Medications should not change

def test_update_prescription_medications_in_payload_no_effect(mock_db_session: MagicMock):
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user_dependency(MOCK_CLINIC_USER_1)
    
    original_med_count = len(MOCK_PRESCRIPTION_1.medications)
    payload_with_meds = {
        "notes": "Notes with meds",
        "medications": [{"name": "New Med", "dosage": "1", "frequency": "1", "duration_days": 1}]
    }
    
    mock_prescription = MagicMock(spec=Prescription, **MOCK_PRESCRIPTION_1.__dict__)
    # Deepcopy or reconstruct medications if they are mutable and might be changed by other tests
    mock_prescription.medications = [Medication(**med.__dict__) for med in MOCK_PRESCRIPTION_1.medications]
    mock_prescription.patient = MagicMock(spec=Patient, user=MagicMock(spec=User, name=MOCK_PATIENT_USER_1.name))
    mock_prescription.clinic = MagicMock(spec=Clinic, user=MagicMock(spec=User, name=MOCK_CLINIC_USER_1.name))

    mock_db_session.query(Prescription).options().filter().first.return_value = mock_prescription
    
    response = client.put(f"/api/prescriptions/{MOCK_PRESCRIPTION_1.id}", json=payload_with_meds)
    assert response.status_code == status.HTTP_200_OK
    assert mock_prescription.notes == payload_with_meds["notes"]
    # Verify medications were NOT changed by looking at db.add calls or length
    medications_added_or_changed = [arg[0] for arg in mock_db_session.add.call_args_list if isinstance(arg[0], Medication)]
    assert len(medications_added_or_changed) == 0
    
    data = response.json()
    assert len(data["medications"]) == original_med_count # Should remain unchanged

```
