from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Service, Part
from app.schemas.catalog import (
    Service as ServiceSchema, ServiceCreate, ServiceUpdate,
    Part as PartSchema, PartCreate, PartUpdate
)
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

# --- Services ---

@router.get("/services", response_model=List[ServiceSchema])
def read_services(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Service).offset(skip).limit(limit).all()

@router.post("/services", response_model=ServiceSchema)
def create_service(service_in: ServiceCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    service = Service(**service_in.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.put("/services/{id}", response_model=ServiceSchema)
def update_service(id: str, service_in: ServiceUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    service = db.query(Service).filter(Service.id == id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = service_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)
        
    db.commit()
    db.refresh(service)
    return service

@router.delete("/services/{id}")
def delete_service(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    service = db.query(Service).filter(Service.id == id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"success": True}

# --- Parts ---

@router.get("/parts", response_model=List[PartSchema])
def read_parts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Part).offset(skip).limit(limit).all()

@router.post("/parts", response_model=PartSchema)
def create_part(part_in: PartCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    part = Part(**part_in.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part

@router.put("/parts/{id}", response_model=PartSchema)
def update_part(id: str, part_in: PartUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    part = db.query(Part).filter(Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    update_data = part_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(part, key, value)
        
    db.commit()
    db.refresh(part)
    return part

@router.delete("/parts/{id}")
def delete_part(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    part = db.query(Part).filter(Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(part)
    db.commit()
    return {"success": True}
