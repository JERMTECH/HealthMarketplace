from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, desc
from typing import List, Dict, Any
import uuid
from datetime import datetime

from app.database import get_db
from app.models.users import User
from app.models.products import Product, Order, OrderItem
from app.models.clinics import Clinic
from app.models.patients import Patient
from app.models.prescriptions import Prescription
from app.models.rewards import RewardPoint
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductCategory,
    OrderCreate,
    OrderResponse,
    OrderItemCustomResponse
)
from app.auth import get_current_active_user

router = APIRouter()

# Helper function to check if user is admin
def is_admin(user):
    admin_types = ['admin', 'administrator', 'system']
    return user.type and user.type.lower() in [t.lower() for t in admin_types]

# Get products count for admin dashboard
@router.get("/count", response_model=Dict[str, int])
async def get_products_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    count = db.query(func.count(Product.id)).scalar()
    return {"count": count}

# Get orders count for admin dashboard
@router.get("/orders/count", response_model=Dict[str, int])
async def get_orders_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    count = db.query(func.count(Order.id)).scalar()
    return {"count": count}

# Get recent orders for admin dashboard
@router.get("/orders/recent", response_model=List[OrderResponse])
async def get_recent_orders(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    orders = db.query(Order).order_by(desc(Order.created_at)).limit(limit).all()
    return orders

# Get all orders for admin
@router.get("/orders/all", response_model=List[OrderResponse])
async def get_all_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    orders = db.query(Order).all()
    return orders

# Get patient orders
@router.get("/orders/patient/{patient_id}", response_model=List[OrderResponse])
@router.get("/orders/all/patient/{patient_id}", response_model=List[OrderResponse])
async def get_patient_orders(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is authorized
    if current_user.id != patient_id and current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's orders")
    
    # Get orders for patient
    orders = db.query(Order).filter(Order.patient_id == patient_id).all()
    
    # Prepare response with additional data
    order_responses = []
    for order in orders:
        # Get order items with product details
        items = []
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        
        for item in order_items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                items.append({
                    "id": item.id,
                    "product_id": item.product_id,
                    "name": product.name,
                    "quantity": item.quantity,
                    "price": item.price
                })
        
        # Get clinic name if available
        clinic_name = None
        if order.prescription_id:
            prescription = db.query(Prescription).filter(Prescription.id == order.prescription_id).first()
            if prescription and prescription.clinic_id:
                clinic = db.query(Clinic).join(User).filter(Clinic.id == prescription.clinic_id).first()
                if clinic and clinic.user:
                    clinic_name = clinic.user.name
        
        # Format order with items and additional data
        order_response = {
            "id": order.id,
            "patient_id": order.patient_id,
            "total": order.total,
            "status": order.status,
            "date": order.created_at.isoformat(),
            "points_earned": order.points_earned,
            "items": items,
            "clinic_name": clinic_name
        }
        
        order_responses.append(order_response)
    
    return order_responses

# Get all products
@router.get("/all", response_model=List[ProductResponse])
async def get_all_products(
    category: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if category:
        query = query.filter(Product.category == category)
    
    products = query.all()
    return products

# Get product categories
@router.get("/categories", response_model=List[ProductCategory])
async def get_product_categories(db: Session = Depends(get_db)):
    categories = (
        db.query(
            Product.category.label("name"),
            func.count(Product.id).label("count")
        )
        .filter(Product.category != None)
        .group_by(Product.category)
        .all()
    )
    
    return categories

# Get products by clinic
@router.get("/clinic/{clinic_id}", response_model=List[ProductResponse])
async def get_clinic_products(
    clinic_id: str,
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(Product.clinic_id == clinic_id).all()
    return products

# Add a product
@router.post("/", response_model=ProductResponse)
async def add_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if clinic
    if current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Only clinics can add products")
    
    # Create product
    product = Product(
        id=str(uuid.uuid4()),
        clinic_id=current_user.id,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        category=product_data.category,
        in_stock=product_data.in_stock,
        image_url=product_data.image_url
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product

# Update a product
@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user is authorized
    if current_user.id != product.clinic_id or current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Update product
    for key, value in product_data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    
    return product

# Delete a product
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get product
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user is authorized
    if current_user.id != product.clinic_id or current_user.type != "clinic":
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    # Delete product
    db.delete(product)
    db.commit()
    
    return None

# Create an order with simplified validation
@router.post("/order", response_model=OrderResponse)
async def create_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if patient
    if current_user.type != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create orders")
    
    # Always use current user ID for security
    patient_id = current_user.id
    
    # Extract items from the order data, with validation and fallbacks
    if "items" not in order_data or not order_data["items"]:
        raise HTTPException(status_code=400, detail="Order must contain items")
    
    items = order_data.get("items", [])
    
    # Extract product IDs from items
    product_ids = []
    for item in items:
        if isinstance(item, dict) and "product_id" in item:
            product_ids.append(item["product_id"])
            
    if not product_ids:
        raise HTTPException(status_code=400, detail="No valid products found in order")
    
    # Get products
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    
    if len(products) == 0:
        raise HTTPException(status_code=400, detail="No valid products found in database")
    
    # Calculate total
    total = 0.0
    for item in items:
        if not isinstance(item, dict) or "product_id" not in item:
            continue
            
        product = next((p for p in products if p.id == item["product_id"]), None)
        if product:
            try:
                item_quantity = int(item.get("quantity", "1"))
                item_total = float(product.price) * item_quantity
                total += item_total
            except (ValueError, TypeError):
                # Use default values if conversion fails
                item_total = float(product.price)
                total += item_total
    
    # Simplify order creation for maximum reliability
    # Generate a unique ID for the new order
    order_id = str(uuid.uuid4())
    
    # Create the order record with just the essential fields
    # Always use authenticated user's ID and handle None values
    order = Order(
        id=order_id,
        patient_id=current_user.id,  # Use the authenticated user ID
        prescription_id=None,  # No prescription needed for basic orders
        total=str(total),
        status="processing",
        points_earned=str(int(total * 10))  # 10 points per dollar
    )
    
    db.add(order)
    
    # Calculate reward points (10 points per dollar)
    points_earned = int(total * 10)
    
    # Add reward points - use current_user.id to avoid patient_id validation errors
    reward_point = RewardPoint(
        id=str(uuid.uuid4()),
        patient_id=current_user.id,
        points=str(points_earned),
        description=f"Order placed successfully",
        source_id=order.id,
        type="earned"
    )
    
    db.add(reward_point)
    
    # Create order items - using items from dictionary, not calling items() method
    order_items = []
    # Make sure we're using the items list, not calling the items() method on the dict
    items_list = order_data["items"] if "items" in order_data else []
    
    for item_data in items_list:
        if not isinstance(item_data, dict) or "product_id" not in item_data:
            continue
            
        product_id = item_data.get("product_id")
        quantity = item_data.get("quantity", "1")
        
        product = next((p for p in products if p.id == product_id), None)
        
        if product:
            order_item = OrderItem(
                id=str(uuid.uuid4()),
                order_id=order.id,
                product_id=product_id,
                quantity=quantity, 
                price=product.price
            )
            
            db.add(order_item)
            order_items.append(order_item)
    
    db.commit()
    
    # Refresh order to get updated relationships
    db.refresh(order)
    
    # Prepare response
    response_items = []
    for item in order_items:
        product = next((p for p in products if p.id == item.product_id), None)
        item_dict = {
            "id": item.id,
            "order_id": item.order_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "price": item.price,
            "product_name": product.name if product else None,
            "created_at": item.created_at
        }
        response_items.append(item_dict)
    
    # Simply create a dictionary matching our response format
    # This avoids Pydantic validation issues with Column objects
    custom_items = []
    for item in response_items:
        custom_items.append({
            "id": str(item["id"]),
            "product_id": str(item["product_id"]),
            "name": str(item["product_name"] or "Unknown Product"),
            "quantity": str(item["quantity"]),
            "price": str(item["price"])
        })
    
    # Current date in the correct format
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    # Dictionary that matches OrderResponse model
    order_response = {
        "id": str(order.id),
        "patient_id": str(order.patient_id),
        "prescription_id": str(order.prescription_id) if order.prescription_id else None,
        "total": str(order.total),
        "status": str(order.status),
        "points_earned": str(order.points_earned),
        "date": current_date,
        "items": custom_items
    }
    
    return order_response