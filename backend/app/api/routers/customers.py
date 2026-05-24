from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Customer
from app.schemas.customer import Customer as CustomerSchema, CustomerCreate, CustomerUpdate
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[CustomerSchema])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/{id}", response_model=CustomerSchema)
def read_customer(id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=CustomerSchema)
def create_customer(customer_in: CustomerCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    customer = Customer(**customer_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{id}", response_model=CustomerSchema)
def update_customer(id: str, customer_in: CustomerUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
        
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{id}")
def delete_customer(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"success": True}
