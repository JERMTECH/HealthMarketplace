import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, call
import uuid
from datetime import datetime

from app.main import app  # Assuming FastAPI app instance is here
from app.schemas.product import UserOrderCreate, OrderResponse, OrderItemCreate, OrderItemCustomResponse
from app.models.users import User
from app.models.products import Product, Order, OrderItem
from app.models.rewards import RewardPoint

# TestClient instance
client = TestClient(app)

# Mock data
MOCK_PATIENT_USER = User(id="test_patient_1", type="patient", email="patient1@example.com", name="Test Patient One", is_active=True)
MOCK_NON_PATIENT_USER = User(id="test_clinic_1", type="clinic", email="clinic1@example.com", name="Test Clinic One", is_active=True)

MOCK_PRODUCT_1 = Product(id="prod_1", name="Product 1", price="15.50", category="Category A", in_stock=True, clinic_id="clinic_1")
MOCK_PRODUCT_2 = Product(id="prod_2", name="Product 2", price="10.00", category="Category B", in_stock=True, clinic_id="clinic_1")
MOCK_PRODUCT_3_INVALID_PRICE = Product(id="prod_3_invalid_price", name="Product 3 Invalid Price", price="TEN_DOLLARS", category="Category C", in_stock=True, clinic_id="clinic_1")

# Helper to simulate product query
def mock_product_query_side_effect(product_list_to_return):
    def side_effect(model_class):
        if model_class == Product:
            query_mock = MagicMock()
            # Simulate the filter().all() chain
            filter_mock = MagicMock()
            filter_mock.all.return_value = product_list_to_return
            query_mock.filter.return_value = filter_mock
            return query_mock
        # Fallback for any other model if needed, though create_order primarily queries Product
        return MagicMock()
    return side_effect


@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

def test_create_order_success_single_item(mock_db_session: MagicMock):
    """Test successful order creation with a single item."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):

        order_payload = {
            "items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "1"}]
        }
        response = client.post("/api/products/order", json=order_payload)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["patient_id"] == MOCK_PATIENT_USER.id
        assert data["total"] == "15.50"
        assert data["points_earned"] == "155" # 15.50 * 10
        assert len(data["items"]) == 1
        item_resp = data["items"][0]
        assert item_resp["product_id"] == MOCK_PRODUCT_1.id
        assert item_resp["name"] == MOCK_PRODUCT_1.name
        assert item_resp["quantity"] == "1"
        assert item_resp["price"] == MOCK_PRODUCT_1.price
        assert "id" in item_resp # Check OrderItem ID is present
        assert data["clinic_name"] is None

        # Verify DB calls
        added_objects = [args[0][0] for args in mock_db_session.add.call_args_list]
        
        order_obj = next((obj for obj in added_objects if isinstance(obj, Order)), None)
        assert order_obj is not None
        assert order_obj.patient_id == MOCK_PATIENT_USER.id
        assert order_obj.total == "15.50"
        assert order_obj.points_earned == "155"
        assert order_obj.status == "processing"

        order_item_obj = next((obj for obj in added_objects if isinstance(obj, OrderItem)), None)
        assert order_item_obj is not None
        assert order_item_obj.product_id == MOCK_PRODUCT_1.id
        assert order_item_obj.quantity == "1"
        assert order_item_obj.price == MOCK_PRODUCT_1.price
        assert order_item_obj.order_id == order_obj.id

        reward_point_obj = next((obj for obj in added_objects if isinstance(obj, RewardPoint)), None)
        assert reward_point_obj is not None
        assert reward_point_obj.patient_id == MOCK_PATIENT_USER.id
        assert reward_point_obj.points == "155"
        assert reward_point_obj.source_id == order_obj.id

        mock_db_session.commit.assert_called_once()
        # refresh is called for order and for each order item
        assert mock_db_session.refresh.call_count >= 2 


def test_create_order_success_multiple_items_varied_quantity(mock_db_session: MagicMock):
    """Test successful order creation with multiple items and varied quantities."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1, MOCK_PRODUCT_2]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):

        order_payload = {
            "items": [
                {"product_id": MOCK_PRODUCT_1.id, "quantity": "2"}, # 2 * 15.50 = 31.00
                {"product_id": MOCK_PRODUCT_2.id, "quantity": "3"}  # 3 * 10.00 = 30.00
            ]
        } # Total = 61.00
        response = client.post("/api/products/order", json=order_payload)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["patient_id"] == MOCK_PATIENT_USER.id
        assert data["total"] == "61.00"
        assert data["points_earned"] == "610" # 61.00 * 10
        assert len(data["items"]) == 2
        
        # Check items in response (order might not be guaranteed)
        item1_resp = next(item for item in data["items"] if item["product_id"] == MOCK_PRODUCT_1.id)
        item2_resp = next(item for item in data["items"] if item["product_id"] == MOCK_PRODUCT_2.id)

        assert item1_resp["name"] == MOCK_PRODUCT_1.name
        assert item1_resp["quantity"] == "2"
        assert item1_resp["price"] == MOCK_PRODUCT_1.price

        assert item2_resp["name"] == MOCK_PRODUCT_2.name
        assert item2_resp["quantity"] == "3"
        assert item2_resp["price"] == MOCK_PRODUCT_2.price
        
        # Verify DB calls
        added_objects = [args[0][0] for args in mock_db_session.add.call_args_list]
        order_obj = next((obj for obj in added_objects if isinstance(obj, Order)), None)
        assert order_obj.total == "61.00"
        assert order_obj.points_earned == "610"

        order_item_count = sum(1 for obj in added_objects if isinstance(obj, OrderItem))
        assert order_item_count == 2
        
        mock_db_session.commit.assert_called_once()
        assert mock_db_session.refresh.call_count >= 3 # Order + 2 OrderItems


def test_create_order_validation_empty_items(mock_db_session: MagicMock):
    """Test order creation with an empty items list (Pydantic validation)."""
    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": []}
        response = client.post("/api/products/order", json=order_payload)
        # This is a business logic validation in the endpoint, not Pydantic
        assert response.status_code == status.HTTP_400_BAD_REQUEST 
        assert "Order must contain items" in response.json()["detail"]

def test_create_order_validation_missing_product_id_in_item(mock_db_session: MagicMock):
    """Test order creation with an item missing product_id (Pydantic validation)."""
    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"quantity": "1"}]} # Missing product_id
        response = client.post("/api/products/order", json=order_payload)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_create_order_product_not_found(mock_db_session: MagicMock):
    """Test order creation when a product_id in items does not exist in the database."""
    # Simulate product query returning an empty list or not all requested products
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([])) # No products found

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"product_id": "non_existent_prod", "quantity": "1"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST # As per current endpoint logic
        assert "One or more products not found or duplicated" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_product_not_found_partial(mock_db_session: MagicMock):
    """Test order creation when some products exist and some don't."""
    # Simulate finding only MOCK_PRODUCT_1
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {
            "items": [
                {"product_id": MOCK_PRODUCT_1.id, "quantity": "1"},
                {"product_id": "non_existent_prod_2", "quantity": "1"}
            ]
        }
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "One or more products not found or duplicated" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()


def test_create_order_invalid_quantity_format(mock_db_session: MagicMock):
    """Test order creation with a non-integer quantity string."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "abc"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert f"Invalid quantity format for product {MOCK_PRODUCT_1.name}" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_zero_quantity(mock_db_session: MagicMock):
    """Test order creation with zero quantity."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "0"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert f"Quantity for product {MOCK_PRODUCT_1.name} must be positive" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_negative_quantity(mock_db_session: MagicMock):
    """Test order creation with negative quantity."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "-1"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert f"Quantity for product {MOCK_PRODUCT_1.name} must be positive" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_invalid_product_price_in_db(mock_db_session: MagicMock):
    """Test order creation when a product has an invalid price format in the database."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_3_INVALID_PRICE]))

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        order_payload = {"items": [{"product_id": MOCK_PRODUCT_3_INVALID_PRICE.id, "quantity": "1"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert f"Invalid price format for product {MOCK_PRODUCT_3_INVALID_PRICE.name} in database" in response.json()["detail"]
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_user_not_patient(mock_db_session: MagicMock):
    """Test order creation when the current_user is not of type 'patient'."""
    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_NON_PATIENT_USER): # User is a clinic
        
        order_payload = {"items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "1"}]}
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only patients can create orders" in response.json()["detail"]
        mock_db_session.query.assert_not_called() # Should fail before DB query
        mock_db_session.add.assert_not_called()
        mock_db_session.commit.assert_not_called()

def test_create_order_with_prescription_id(mock_db_session: MagicMock):
    """Test successful order creation with a prescription_id."""
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))
    test_prescription_id = str(uuid.uuid4())

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):

        order_payload = {
            "items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "1"}],
            "prescription_id": test_prescription_id
        }
        response = client.post("/api/products/order", json=order_payload)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["prescription_id"] == test_prescription_id

        added_objects = [args[0][0] for args in mock_db_session.add.call_args_list]
        order_obj = next((obj for obj in added_objects if isinstance(obj, Order)), None)
        assert order_obj is not None
        assert order_obj.prescription_id == test_prescription_id
        mock_db_session.commit.assert_called_once()

def test_create_order_no_product_ids_in_items(mock_db_session: MagicMock):
    """Test order creation when items list is provided but contains no product_ids (due to UserOrderCreate schema)."""
    # This scenario is slightly different from empty items list.
    # If items are [{ "quantity": "1"}] Pydantic will fail (HTTP 422).
    # If items are product_ids: [] this is caught by `if not product_ids` in endpoint (HTTP 400).
    # The UserOrderCreate schema requires product_id in OrderItemCreate.
    # So, this test will focus on the Pydantic validation aspect.

    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER):
        
        # Payload where an item in the list is missing 'product_id'
        order_payload = {
            "items": [{"quantity": "1"}] # product_id is missing
        }
        response = client.post("/api/products/order", json=order_payload)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        # Check for Pydantic error message structure
        assert "detail" in response.json()
        assert any("product_id" in err["loc"] and "field required" in err["msg"].lower() for err in response.json()["detail"])

        # Payload where items is not a list of dicts
        order_payload_invalid_item_type = {
            "items": ["just_a_string_item"] 
        }
        response_invalid_item = client.post("/api/products/order", json=order_payload_invalid_item_type)
        assert response_invalid_item.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "detail" in response_invalid_item.json()
        assert any("value is not a valid dict" in err["msg"].lower() for err in response_invalid_item.json()["detail"])

# Example of how date is populated in response if created_at is set on mock order object
def test_create_order_response_date_population(mock_db_session: MagicMock):
    mock_db_session.query = MagicMock(side_effect=mock_product_query_side_effect([MOCK_PRODUCT_1]))
    
    # Mock the order object that would be created and refreshed
    mock_order_instance = Order(
        id=str(uuid.uuid4()),
        patient_id=MOCK_PATIENT_USER.id,
        total="15.50",
        status="processing",
        points_earned="155",
        created_at=datetime.utcnow() # Set a created_at time
    )
    
    # Simulate that db.add captures the order, and db.refresh updates it (important for created_at)
    def mock_add_side_effect(obj):
        if isinstance(obj, Order):
            # Simulate DB setting the ID and created_at if they weren't set by app code before add
            # In our case, ID is set by app, created_at is by DB default in model
            obj.id = obj.id or str(uuid.uuid4()) # Ensure ID exists
            # created_at is server_default=func.now(), so it's set by DB
            # We simulate this by setting it on the object that refresh would operate on
            
            # To effectively test the 'date' field in response, we must ensure
            # the 'order' object that is passed to OrderResponse has 'created_at'
            # The endpoint uses db.refresh(order).
            # So, the 'order' object *after* db.refresh(order) is what matters.
            
            # The best way to mock this is to have db.refresh actually update the object.
            # Here, we'll assume that the mock_order_instance IS the instance that gets refreshed.
            # So, if we want to test the date, we should ensure mock_order_instance.created_at is set.
            # The actual test for db calls is in test_create_order_success_single_item.
            # This test focuses on the response formatting based on a populated order object.
            pass

    mock_db_session.add = MagicMock(side_effect=mock_add_side_effect)
    
    # Simulate refresh populating created_at on the passed object
    def mock_refresh_side_effect(obj):
        if isinstance(obj, Order):
            obj.created_at = mock_order_instance.created_at # ensure it has the date
        if isinstance(obj, OrderItem): # OrderItems also have created_at
            obj.created_at = datetime.utcnow()


    mock_db_session.refresh = MagicMock(side_effect=mock_refresh_side_effect)


    with patch('app.routes.products.get_db', return_value=mock_db_session), \
         patch('app.routes.products.get_current_active_user', return_value=MOCK_PATIENT_USER), \
         patch('app.routes.products.Order', return_value=mock_order_instance): # Patch Order constructor to return our mock

        order_payload = {
            "items": [{"product_id": MOCK_PRODUCT_1.id, "quantity": "1"}]
        }
        response = client.post("/api/products/order", json=order_payload)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == mock_order_instance.id
        assert data["date"] == mock_order_instance.created_at.isoformat()

        # Ensure refresh was called on the order instance we provided
        # This check is a bit complex due to how objects are passed around.
        # A simpler way is in the main success test to check if 'date' is present and a valid ISO date string.
        found_refresh_on_order = any(
            call_args[0][0].id == mock_order_instance.id for call_args in mock_db_session.refresh.call_args_list if isinstance(call_args[0][0], Order)
        )
        assert found_refresh_on_order
