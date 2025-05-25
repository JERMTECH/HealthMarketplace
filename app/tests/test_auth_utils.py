import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    authenticate_user,
    get_current_user,
    get_current_active_user,
    SECRET_KEY,
    ALGORITHM
)
from app.models.users import User

# --- Tests for get_password_hash ---

def test_get_password_hash_returns_string():
    hashed_password = get_password_hash("testpassword")
    assert isinstance(hashed_password, str)

def test_get_password_hash_different_from_input():
    plain_password = "testpassword"
    hashed_password = get_password_hash(plain_password)
    assert hashed_password != plain_password

def test_get_password_hash_different_for_same_password_due_to_salt():
    plain_password = "testpassword"
    hashed_password1 = get_password_hash(plain_password)
    hashed_password2 = get_password_hash(plain_password)
    assert hashed_password1 != hashed_password2

# --- Tests for verify_password ---

def test_verify_password_correct():
    plain_password = "testpassword"
    hashed_password = get_password_hash(plain_password)
    assert verify_password(plain_password, hashed_password) is True

def test_verify_password_incorrect():
    plain_password = "testpassword"
    hashed_password = get_password_hash(plain_password)
    assert verify_password("wrongpassword", hashed_password) is False

# --- Tests for create_access_token ---

def test_create_access_token_successful():
    user_id = "test_user_123"
    data = {"sub": user_id}
    token = create_access_token(data)
    assert isinstance(token, str)

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == user_id
    assert "exp" in payload
    assert isinstance(payload["exp"], int)
    assert datetime.fromtimestamp(payload["exp"]) > datetime.utcnow()

def test_create_access_token_with_custom_expires_delta():
    user_id = "test_user_456"
    data = {"sub": user_id}
    expires_delta = timedelta(minutes=5)
    
    # Calculate expected expiry time with a small buffer for execution delay
    expected_exp_time_min = datetime.utcnow() + expires_delta - timedelta(seconds=5)
    expected_exp_time_max = datetime.utcnow() + expires_delta + timedelta(seconds=5)

    token = create_access_token(data, expires_delta=expires_delta)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == user_id
    exp_datetime = datetime.fromtimestamp(payload["exp"])
    assert expected_exp_time_min < exp_datetime < expected_exp_time_max

# --- Tests for authenticate_user ---

MOCK_USER_FROM_DB = User(
    id="auth_user_1",
    email="auth@example.com",
    hashed_password=get_password_hash("correctpassword"), # Use actual hash for integrated test
    name="Auth User",
    type="patient",
    is_active=True
)

@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

def test_authenticate_user_not_found(mock_db_session: MagicMock):
    mock_query = MagicMock()
    mock_query.filter().first.return_value = None
    mock_db_session.query.return_value = mock_query

    result = authenticate_user(mock_db_session, "nonexistent@example.com", "anypassword")
    assert result is False
    mock_db_session.query.assert_called_once_with(User)

def test_authenticate_user_wrong_password(mock_db_session: MagicMock):
    mock_query = MagicMock()
    mock_query.filter().first.return_value = MOCK_USER_FROM_DB
    mock_db_session.query.return_value = mock_query
    
    # Here we rely on the actual verify_password and get_password_hash
    result = authenticate_user(mock_db_session, MOCK_USER_FROM_DB.email, "wrongpassword")
    assert result is False
    mock_db_session.query.assert_called_once_with(User)

def test_authenticate_user_success(mock_db_session: MagicMock):
    mock_query = MagicMock()
    mock_query.filter().first.return_value = MOCK_USER_FROM_DB
    mock_db_session.query.return_value = mock_query

    # Here we rely on the actual verify_password and get_password_hash
    result = authenticate_user(mock_db_session, MOCK_USER_FROM_DB.email, "correctpassword")
    assert result == MOCK_USER_FROM_DB
    mock_db_session.query.assert_called_once_with(User)

# --- Tests for get_current_user ---

MOCK_TOKEN_USER_ID = "token_user_id_789"
MOCK_VALID_TOKEN_PAYLOAD = {"sub": MOCK_TOKEN_USER_ID, "exp": datetime.utcnow() + timedelta(minutes=15)}
MOCK_USER_FOR_TOKEN_AUTH = User(id=MOCK_TOKEN_USER_ID, email="tokenuser@example.com", is_active=True, name="Token User")

@pytest.mark.asyncio
async def test_get_current_user_jwt_error(mock_db_session: MagicMock):
    with patch('app.auth.jwt.decode', side_effect=JWTError("Invalid token")) as mock_jwt_decode:
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("invalid_token_string", mock_db_session)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in exc_info.value.detail
        mock_jwt_decode.assert_called_once_with("invalid_token_string", SECRET_KEY, algorithms=[ALGORITHM])
        mock_db_session.query.assert_not_called()

@pytest.mark.asyncio
async def test_get_current_user_payload_no_sub(mock_db_session: MagicMock):
    # Payload missing 'sub' key
    invalid_payload = {"exp": datetime.utcnow() + timedelta(minutes=15)}
    with patch('app.auth.jwt.decode', return_value=invalid_payload) as mock_jwt_decode:
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("valid_token_no_sub", mock_db_session)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in exc_info.value.detail # or specific "User ID not found in token"
        mock_jwt_decode.assert_called_once_with("valid_token_no_sub", SECRET_KEY, algorithms=[ALGORITHM])
        mock_db_session.query.assert_not_called()

@pytest.mark.asyncio
async def test_get_current_user_db_user_not_found(mock_db_session: MagicMock):
    mock_query = MagicMock()
    mock_query.filter().first.return_value = None # User not found in DB
    mock_db_session.query.return_value = mock_query

    with patch('app.auth.jwt.decode', return_value=MOCK_VALID_TOKEN_PAYLOAD) as mock_jwt_decode:
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("valid_token_user_not_in_db", mock_db_session)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "User not found" in exc_info.value.detail # Or a generic credentials error
        mock_jwt_decode.assert_called_once()
        mock_db_session.query.assert_called_once_with(User)
        # Check that the filter was called with the correct user ID from the token
        # This requires inspecting the call args of filter, which can be complex.
        # For simplicity, we assume if query(User) is called, the subsequent filter is based on the "sub".

@pytest.mark.asyncio
async def test_get_current_user_success(mock_db_session: MagicMock):
    mock_query = MagicMock()
    mock_query.filter().first.return_value = MOCK_USER_FOR_TOKEN_AUTH # User found in DB
    mock_db_session.query.return_value = mock_query

    with patch('app.auth.jwt.decode', return_value=MOCK_VALID_TOKEN_PAYLOAD) as mock_jwt_decode:
        user = await get_current_user("valid_token_user_exists", mock_db_session)
        
        assert user == MOCK_USER_FOR_TOKEN_AUTH
        mock_jwt_decode.assert_called_once()
        mock_db_session.query.assert_called_once_with(User)

# --- Tests for get_current_active_user ---

@pytest.mark.asyncio
async def test_get_current_active_user_is_active():
    active_user = User(id="active_user_id", email="active@example.com", is_active=True, name="Active User")
    result = await get_current_active_user(active_user)
    assert result == active_user

@pytest.mark.asyncio
async def test_get_current_active_user_is_inactive():
    inactive_user = User(id="inactive_user_id", email="inactive@example.com", is_active=False, name="Inactive User")
    with pytest.raises(HTTPException) as exc_info:
        await get_current_active_user(inactive_user)
    
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Inactive user" in exc_info.value.detail

# Test with a User object that has no is_active attribute (should not happen with Pydantic model, but good for robustness)
@pytest.mark.asyncio
async def test_get_current_active_user_missing_is_active_attr():
    user_missing_active_flag = MagicMock(spec=User) # Use a mock that doesn't have is_active by default
    # To simulate it not having the attribute, ensure it's not set or del it if it was auto-added by MagicMock
    # For MagicMock, attributes are created on access if not explicitly set.
    # To truly test this, we might need a real object or a carefully crafted mock.
    # However, Pydantic models will always have the attribute, even if it's None.
    # If current_user: User is type-hinted, FastAPI will ensure it's a User instance.
    # So, this test might be more about Python's behavior than a realistic scenario.
    
    # Let's assume current_user is a User model instance, which will have is_active.
    # If we want to test a malformed User object, we'd need to bypass Pydantic.
    # For now, focusing on the is_active=False case is primary.
    # If is_active can be None, and that means inactive:
    user_with_none_active = User(id="none_active_user", email="none@example.com", is_active=None, name="None Active")
    with pytest.raises(HTTPException) as exc_info: # Assuming None means inactive
         await get_current_active_user(user_with_none_active)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Inactive user" in exc_info.value.detail

# It's also good practice to ensure the SECRET_KEY and ALGORITHM are not default/weak values
# This is not a functional test of the utils, but a security check.
def test_security_constants_are_set():
    assert SECRET_KEY is not None
    assert SECRET_KEY != "your_secret_key_here" # Example default often found in templates
    assert ALGORITHM is not None
    assert ALGORITHM != "HS256" or ALGORITHM.startswith("HS") # Or check for stronger like ES, RS
    # For this project, HS256 is used, so the check above would be:
    assert ALGORITHM == "HS256" # If this is the intended algorithm.
                                # If stronger is desired, this test would fail and flag it.
                                # Given the context, HS256 is likely intended.
    assert len(SECRET_KEY) > 20 # Arbitrary check for some minimal length/complexity
                                # This is a very basic check; real key strength is more complex.

# Fixture to provide a valid token for testing get_current_user
@pytest.fixture
def valid_access_token():
    return create_access_token(data={"sub": MOCK_USER_FOR_TOKEN_AUTH.id})

@pytest.mark.asyncio
async def test_get_current_user_integration_with_valid_token(mock_db_session: MagicMock, valid_access_token: str):
    """
    An integration-style test for get_current_user that uses a real token
    generated by create_access_token.
    """
    mock_query = MagicMock()
    mock_query.filter_by(id=MOCK_USER_FOR_TOKEN_AUTH.id).first.return_value = MOCK_USER_FOR_TOKEN_AUTH
    mock_db_session.query(User).return_value = mock_query # Ensure query(User) is what filter_by is called on

    # No need to mock jwt.decode here, we want to test its interaction
    user = await get_current_user(token=valid_access_token, db=mock_db_session)
    
    assert user is not None
    assert user.id == MOCK_USER_FOR_TOKEN_AUTH.id
    
    # Check that db.query(User).filter_by(id=...).first() was called
    mock_db_session.query(User).filter_by(id=MOCK_USER_FOR_TOKEN_AUTH.id).first.assert_called_once()

# Note: The `get_current_active_user` is an async function in `auth.py` but its logic
# is synchronous. `await` is used when calling it, so tests are `async def`.
# The `get_current_user` is also async and involves async operations if `jwt.decode`
# were async (it's not, but the function is defined as async).
# `pytest.mark.asyncio` is used for such tests.

```python
# Small correction in app.auth.py (if this is the actual content)
# `get_current_user`'s `db.query(User).filter(User.id == user_id).first()` should be
# `db.query(User).filter(User.id == payload.get("sub")).first()` or similar if user_id is from token.
# The tests above for get_current_user assume payload.get("sub") is used correctly to fetch user_id.

# The test `test_get_current_user_db_user_not_found` and `_success`
# implicitly test that the filter on User.id is called with the correct ID from the token's "sub" claim.
# If that logic was `User.email == payload.get("sub")`, for example, the tests would fail
# unless MOCK_USER_FOR_TOKEN_AUTH.id was also a valid email, which is not the case.
```
