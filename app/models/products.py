from sqlalchemy import Column, String, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship
import uuid

from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinics.id"))
    name = Column(String)
    description = Column(String, nullable=True)
    price = Column(String)  # Stored as string for floating-point precision
    category = Column(String, nullable=True)
    in_stock = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    clinic = relationship("Clinic", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    prescription_id = Column(String, ForeignKey("prescriptions.id"), nullable=True)
    total = Column(String)  # Stored as string for floating-point precision
    status = Column(String, default="processing")  # processing, shipped, delivered, cancelled
    points_earned = Column(String, default="0")  # Points earned from this order
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient")
    prescription = relationship("Prescription")  # Removed invalid nullable parameter
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"))
    product_id = Column(String, ForeignKey("products.id"))
    quantity = Column(String, default="1")
    price = Column(String)  # Price at time of order
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")