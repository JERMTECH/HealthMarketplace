from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
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
    # OrderCreate, # We are using UserOrderCreate now
    UserOrderCreate, # Renamed for clarity
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

# Get all orders for admin dashboard
@router.get("/orders/all")
async def get_admin_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")

    db_orders = db.query(Order).options(
        joinedload(Order.patient).joinedload(Patient.user),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).all()

    response_orders = []
    for order in db_orders:
        order_items_data = []
        for item in order.items:
            order_items_data.append({
                "id": item.id,
                "name": item.product.name if item.product else "Unknown Product",
                "quantity": item.quantity,
                "price": item.price
            })
        
        response_orders.append({
            "id": order.id,
            "patient_id": order.patient_id,
            "patient_name": order.patient.user.name if order.patient and order.patient.user else "Unknown Patient",
            "total": order.total,
            "status": order.status,
            "points_earned": order.points_earned,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": order_items_data
        })
    
    return response_orders

# Get recent orders for admin dashboard
@router.get("/orders/recent")
async def get_recent_orders(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")

    db_orders = db.query(Order).options(
        joinedload(Order.patient).joinedload(Patient.user),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).limit(limit).all()

    response_orders = []
    for order in db_orders:
        order_items_data = []
        for item in order.items:
            order_items_data.append({
                "id": item.id,
                "name": item.product.name if item.product else "Unknown Product",
                "quantity": item.quantity,
                "price": item.price
            })
        
        response_orders.append({
            "id": order.id,
            "patient": {
                "id": order.patient_id,
                "name": order.patient.user.name if order.patient and order.patient.user else "Unknown Patient"
            },
            "total": order.total,
            "status": order.status,
            "points_earned": order.points_earned,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": order_items_data
        })
        
    return response_orders

# Get all orders for admin
@router.get("/orders/all", response_model=List[OrderResponse])
async def get_all_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if admin
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    
    db_orders = db.query(Order).options(
        joinedload(Order.patient).joinedload(Patient.user), # For patient_name if needed by OrderResponse indirectly or future use
        joinedload(Order.items).joinedload(OrderItem.product), # For items
        joinedload(Order.prescription).joinedload(Prescription.clinic).joinedload(Clinic.user) # For clinic_name
    ).order_by(Order.created_at.desc()).all()

    response_orders = []
    for order in db_orders:
        items_response = []
        for item in order.items:
            items_response.append(OrderItemCustomResponse(
                id=item.id,
                product_id=item.product_id,
                name=item.product.name if item.product else "Unknown Product",
                quantity=item.quantity,
                price=item.price
            ))

        clinic_name = None
        if order.prescription and order.prescription.clinic and order.prescription.clinic.user:
            clinic_name = order.prescription.clinic.user.name
        
        response_orders.append(OrderResponse(
            id=order.id,
            patient_id=order.patient_id,
            prescription_id=order.prescription_id,
            total=order.total,
            status=order.status,
            points_earned=order.points_earned,
            date=order.created_at.isoformat() if order.created_at else None,
            items=items_response,
            clinic_name=clinic_name
        ))
        
    return response_orders

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

# Create an order
@router.post("/order", response_model=OrderResponse)
async def create_order(
    order_data: UserOrderCreate, # Use the new Pydantic model
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if patient
    if current_user.type != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients can create orders")

    if not order_data.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must contain items")

    # Extract product IDs from items
    product_ids = [item.product_id for item in order_data.items]
    if not product_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No product IDs found in order items")

    # Get products from DB
    products_from_db = db.query(Product).filter(Product.id.in_(product_ids)).all()
    products_map = {p.id: p for p in products_from_db}

    if len(products_from_db) != len(set(product_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more products not found or duplicated")

    total = 0.0
    order_items_to_create = []

    for item_data in order_data.items:
        product = products_map.get(item_data.product_id)
        if not product: # Should not happen if previous check is done correctly
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with id {item_data.product_id} not found")

        try:
            item_quantity = int(item_data.quantity)
            if item_quantity <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantity for product {product.name} must be positive.")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid quantity format for product {product.name}.")

        try:
            product_price = float(product.price)
        except ValueError:
            # This indicates bad data in the database for product price
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid price format for product {product.name} in database.")
        
        item_total = product_price * item_quantity
        total += item_total
        
        order_items_to_create.append(OrderItem(
            id=str(uuid.uuid4()),
            product_id=item_data.product_id,
            quantity=str(item_quantity), # Store quantity as string as per schema
            price=str(product_price) # Store price at the time of order as string
        ))

    # Create the Order record
    order_id = str(uuid.uuid4())
    order = Order(
        id=order_id,
        patient_id=current_user.id,
        prescription_id=order_data.prescription_id,
        total=str(total), # Store total as string
        status="processing", # Default status
        points_earned=str(int(total * 10)) # Ensure total is float for calculation
    )
    db.add(order)

    # Link OrderItems to the Order and add to session
    for oi_model in order_items_to_create:
        oi_model.order_id = order_id
        db.add(oi_model)

    # Add reward points
    points_earned_val = int(total * 10)
    reward_point = RewardPoint(
        id=str(uuid.uuid4()),
        patient_id=current_user.id,
        points=str(points_earned_val),
        description="Order placed successfully",
        source_id=order_id,
        type="earned"
    )
    db.add(reward_point)

    db.commit()
    db.refresh(order) # Refresh to get DB-generated values like created_at
    
    # Refresh order items to get their DB-generated values
    for oi_model in order_items_to_create:
        db.refresh(oi_model)

    # Prepare response using Pydantic models
    response_items = []
    for oi_model in order_items_to_create:
        product = products_map.get(oi_model.product_id)
        response_items.append(OrderItemCustomResponse(
            id=oi_model.id,
            product_id=oi_model.product_id,
            name=product.name if product else "Unknown Product",
            quantity=oi_model.quantity,
            price=oi_model.price
        ))

    return OrderResponse(
        id=order.id,
        patient_id=order.patient_id,
        prescription_id=order.prescription_id,
        total=order.total,
        status=order.status,
        points_earned=order.points_earned,
        date=order.created_at.isoformat() if order.created_at else datetime.now().isoformat(), # Populate date
        items=response_items,
        clinic_name=None # clinic_name is not applicable here
    )