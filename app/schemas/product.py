from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: str
    category: Optional[str] = None
    in_stock: bool = True
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    in_stock: Optional[bool] = None
    image_url: Optional[str] = None

class ProductResponse(ProductBase):
    id: str
    clinic_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class ProductCategory(BaseModel):
    name: str
    count: int

class OrderItemBase(BaseModel):
    product_id: str
    quantity: str = "1"

class OrderItemCreate(OrderItemBase):
    price: Optional[str] = None

class OrderItemResponse(OrderItemBase):
    id: str
    order_id: str
    price: str
    product_name: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class OrderBase(BaseModel):
    patient_id: str
    items: List[OrderItemCreate]
    prescription_id: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderItemCustomResponse(BaseModel):
    id: str
    product_id: str
    name: str
    quantity: str
    price: str

class OrderResponse(BaseModel):
    id: str
    patient_id: str
    prescription_id: Optional[str] = None
    total: str
    status: str
    points_earned: str
    date: str
    items: List[OrderItemCustomResponse]
    clinic_name: Optional[str] = None

    class Config:
        orm_mode = True