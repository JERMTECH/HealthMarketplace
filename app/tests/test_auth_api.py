import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, ANY
import uuid
from datetime import datetime

from app.main import app # Assuming FastAPI app instance is here
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.models.users import User
from app.models.patients import Patient
from app.models.clinics import Clinic
from app.auth import get_password_hash # To check if it's called

# TestClient instance
client = TestClient(app)

# Mock data
MOCK_USER_ID_PATIENT = str(uuid.uuid4())
MOCK_USER_ID_CLINIC = str(uuid.uuid4())

MOCK_PATIENT_CREATE_PAYLOAD = {
    "email": "newpatient@example.com",
    "password": "securepassword123",
    "name": "New Patient",
    "type": "patient"
}

MOCK_CLINIC_CREATE_PAYLOAD = {
    "email": "newclinic@example.com",
    "password": "securepassword123",
    "name": "New Clinic",
    "type": "clinic",
    "phone": "1234567890", # Clinic specific
    "address": "123 Clinic St" # Clinic specific
}

MOCK_EXISTING_USER = User(
    id="existing_user_id",
    email="exists@example.com",
    hashed_password="hashed_password_for_existing",
    name="Existing User",
    type="patient",
    is_active=True
)

MOCK_LOGGED_IN_USER_PATIENT = User(
    id=MOCK_USER_ID_PATIENT,
    email=MOCK_PATIENT_CREATE_PAYLOAD["email"],
    name=MOCK_PATIENT_CREATE_PAYLOAD["name"],
    type="patient",
    is_active=True
)

MOCK_LOGGED_IN_USER_CLINIC = User(
    id=MOCK_USER_ID_CLINIC,
    email=MOCK_CLINIC_CREATE_PAYLOAD["email"],
    name=MOCK_CLINIC_CREATE_PAYLOAD["name"],
    type="clinic",
    is_active=True
)


@pytest.fixture
def mock_db_session():
    db = MagicMock(spec=Session)
    # Ensure query(...).filter(...).first() is mockable
    query_mock = MagicMock()
    filter_mock = MagicMock()
    query_mock.filter.return_value = filter_mock
    db.query.return_value = query_mock
    return db

# --- Tests for POST /register ---

@patch('app.routes.auth.get_password_hash')
def test_register_new_patient_success(mock_get_password_hash: MagicMock, mock_db_session: MagicMock):
    mock_get_password_hash.return_value = "hashed_securepassword123"
    mock_db_session.query(User).filter().first.return_value = None # Email not taken

    with patch('app.routes.auth.get_db', return_value=mock_db_session):
        response = client.post("/api/auth/register", json=MOCK_PATIENT_CREATE_PAYLOAD)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Assert user details in response
    assert "user" in data
    user_info = data["user"]
    assert user_info["email"] == MOCK_PATIENT_CREATE_PAYLOAD["email"]
    assert user_info["name"] == MOCK_PATIENT_CREATE_PAYLOAD["name"]
    assert user_info["type"] == MOCK_PATIENT_CREATE_PAYLOAD["type"]
    assert "id" in user_info # ID is generated, so just check presence

    mock_get_password_hash.assert_called_once_with(MOCK_PATIENT_CREATE_PAYLOAD["password"])
    
    # Check that db.add was called with User and Patient objects
    added_objects = [args[0][0] for args in mock_db_session.add.call_args_list]
    user_obj = next((obj for obj in added_objects if isinstance(obj, User)), None)
    patient_obj = next((obj for obj in added_objects if isinstance(obj, Patient)), None)

    assert user_obj is not None
    assert user_obj.email == MOCK_PATIENT_CREATE_PAYLOAD["email"]
    assert user_obj.name == MOCK_PATIENT_CREATE_PAYLOAD["name"]
    assert user_obj.type == "patient"
    assert user_obj.hashed_password == "hashed_securepassword123"

    assert patient_obj is not None
    assert patient_obj.id == user_obj.id # Patient ID should match User ID

    mock_db_session.commit.assert_called_once()

@patch('app.routes.auth.get_password_hash')
def test_register_new_clinic_success(mock_get_password_hash: MagicMock, mock_db_session: MagicMock):
    mock_get_password_hash.return_value = "hashed_securepassword123_clinic"
    mock_db_session.query(User).filter().first.return_value = None # Email not taken

    with patch('app.routes.auth.get_db', return_value=mock_db_session):
        response = client.post("/api/auth/register", json=MOCK_CLINIC_CREATE_PAYLOAD)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    
    # Assert user details in response
    assert "user" in data
    user_info = data["user"]
    assert user_info["email"] == MOCK_CLINIC_CREATE_PAYLOAD["email"]
    assert user_info["name"] == MOCK_CLINIC_CREATE_PAYLOAD["name"]
    assert user_info["type"] == MOCK_CLINIC_CREATE_PAYLOAD["type"]
    assert "id" in user_info

    mock_get_password_hash.assert_called_once_with(MOCK_CLINIC_CREATE_PAYLOAD["password"])

    added_objects = [args[0][0] for args in mock_db_session.add.call_args_list]
    user_obj = next((obj for obj in added_objects if isinstance(obj, User)), None)
    clinic_obj = next((obj for obj in added_objects if isinstance(obj, Clinic)), None)

    assert user_obj is not None
    assert user_obj.email == MOCK_CLINIC_CREATE_PAYLOAD["email"]
    assert user_obj.type == "clinic"

    assert clinic_obj is not None
    assert clinic_obj.id == user_obj.id
    assert clinic_obj.phone == MOCK_CLINIC_CREATE_PAYLOAD["phone"]
    assert clinic_obj.address == MOCK_CLINIC_CREATE_PAYLOAD["address"]

    mock_db_session.commit.assert_called_once()


def test_register_email_already_exists(mock_db_session: MagicMock):
    mock_db_session.query(User).filter().first.return_value = MOCK_EXISTING_USER # Email taken

    with patch('app.routes.auth.get_db', return_value=mock_db_session):
        response = client.post("/api/auth/register", json=MOCK_PATIENT_CREATE_PAYLOAD)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email already registered"
    mock_db_session.add.assert_not_called()
    mock_db_session.commit.assert_not_called()

def test_register_invalid_user_type(mock_db_session: MagicMock):
    payload_invalid_type = MOCK_PATIENT_CREATE_PAYLOAD.copy()
    payload_invalid_type["type"] = "admin"
    mock_db_session.query(User).filter().first.return_value = None # Email not taken

    with patch('app.routes.auth.get_db', return_value=mock_db_session):
        response = client.post("/api/auth/register", json=payload_invalid_type)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Invalid user type. Must be 'patient' or 'clinic'."
    mock_db_session.rollback.assert_called_once() # Check rollback on failure
    mock_db_session.add.assert_not_called() # Or ensure user wasn't added before rollback
    mock_db_session.commit.assert_not_called()

def test_register_missing_fields():
    response = client.post("/api/auth/register", json={"email": "test@example.com"}) # Missing password, name, type
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# --- Tests for POST /login (JSON) ---

def mock_authenticate_user_success(db_session, email, password):
    # Based on email, return appropriate mock user
    if email == MOCK_LOGGED_IN_USER_PATIENT.email:
        return MOCK_LOGGED_IN_USER_PATIENT
    elif email == MOCK_LOGGED_IN_USER_CLINIC.email:
        return MOCK_LOGGED_IN_USER_CLINIC
    return None

def mock_authenticate_user_failure(db_session, email, password):
    return None

def test_login_json_success_patient():
    app.dependency_overrides[MagicMock(spec=Session)] = lambda: mock_db_session # Not used by authenticate_user directly
    app.dependency_overrides['authenticate_user'] = lambda: mock_authenticate_user_success
    
    login_payload = {
        "email": MOCK_LOGGED_IN_USER_PATIENT.email,
        "password": "correctpassword" # Password doesn't matter due to mock
    }
    response = client.post("/api/auth/login", json=login_payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == MOCK_LOGGED_IN_USER_PATIENT.email
    assert data["user"]["name"] == MOCK_LOGGED_IN_USER_PATIENT.name
    assert data["user"]["type"] == "patient"
    
    del app.dependency_overrides['authenticate_user']
    del app.dependency_overrides[MagicMock(spec=Session)]


def test_login_json_failure_incorrect_credentials():
    app.dependency_overrides['authenticate_user'] = lambda: mock_authenticate_user_failure
    
    login_payload = {"email": "test@example.com", "password": "wrongpassword"}
    response = client.post("/api/auth/login", json=login_payload)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect email or password"
    del app.dependency_overrides['authenticate_user']

def test_login_json_missing_fields():
    response = client.post("/api/auth/login", json={"email": "test@example.com"}) # Missing password
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

# --- Tests for POST /token (Form Data) ---

def test_token_form_data_success_patient():
    app.dependency_overrides['authenticate_user'] = lambda: mock_authenticate_user_success

    form_data = {
        "username": MOCK_LOGGED_IN_USER_PATIENT.email, # Form field is 'username'
        "password": "correctpassword"
    }
    response = client.post("/api/auth/token", data=form_data)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # /token endpoint also returns user details
    assert "user" in data
    assert data["user"]["email"] == MOCK_LOGGED_IN_USER_PATIENT.email
    del app.dependency_overrides['authenticate_user']

def test_token_form_data_failure_incorrect_credentials():
    app.dependency_overrides['authenticate_user'] = lambda: mock_authenticate_user_failure
    
    form_data = {"username": "test@example.com", "password": "wrongpassword"}
    response = client.post("/api/auth/token", data=form_data)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect email or password"
    del app.dependency_overrides['authenticate_user']

# --- Tests for GET /me ---

MOCK_ACTIVE_USER_FOR_ME = UserResponse(
    id=str(uuid.uuid4()), 
    email="me@example.com", 
    name="Current User", 
    type="patient", 
    is_active=True,
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)

async def mock_get_current_active_user_success():
    return MOCK_ACTIVE_USER_FOR_ME

async def mock_get_current_active_user_inactive():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

async def mock_get_current_active_user_invalid_token():
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

def test_get_me_success():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_success
    # Token needs to be present, TestClient handles this if it's a real token.
    # For mocked dependency, the token content doesn't strictly matter for this unit test.
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer faketoken"})
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == MOCK_ACTIVE_USER_FOR_ME.email
    assert data["name"] == MOCK_ACTIVE_USER_FOR_ME.name
    assert data["type"] == MOCK_ACTIVE_USER_FOR_ME.type
    assert data["is_active"] == True # Ensure UserResponse fields are present
    del app.dependency_overrides['get_current_active_user']

def test_get_me_no_token():
    # No Authorization header, relies on oauth2_scheme to raise 401
    # Note: TestClient won't automatically trigger the dependency if no header is sent
    # and the route expects auth. This tests the FastAPI/OAuth2 interaction.
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED 
    assert response.json()["detail"] == "Not authenticated" # Default from OAuth2PasswordBearer

def test_get_me_invalid_token():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_invalid_token
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in response.json()["detail"]
    del app.dependency_overrides['get_current_active_user']

def test_get_me_inactive_user():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_inactive
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer tokenforinactiveuser"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Inactive user" in response.json()["detail"]
    del app.dependency_overrides['get_current_active_user']

# --- Tests for GET /check ---

def test_get_check_success():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_success
    response = client.get("/api/auth/check", headers={"Authorization": "Bearer faketoken"})
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["authenticated"] is True
    assert "user" in data
    assert data["user"]["email"] == MOCK_ACTIVE_USER_FOR_ME.email
    del app.dependency_overrides['get_current_active_user']

def test_get_check_no_token():
    response = client.get("/api/auth/check")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_check_invalid_token():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_invalid_token
    response = client.get("/api/auth/check", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    del app.dependency_overrides['get_current_active_user']

def test_get_check_inactive_user():
    app.dependency_overrides['get_current_active_user'] = mock_get_current_active_user_inactive
    response = client.get("/api/auth/check", headers={"Authorization": "Bearer tokenforinactiveuser"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    del app.dependency_overrides['get_current_active_user']

# Cleanup dependency overrides after all tests in the module if needed,
# or manage them per test as done above.
# Pytest fixtures can also manage this setup/teardown.
@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides = {}
```
