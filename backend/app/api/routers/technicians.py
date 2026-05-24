from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Technician
from app.schemas.technician import Technician as TechnicianSchema, TechnicianCreate, TechnicianUpdate
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[TechnicianSchema])
def read_technicians(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Technician).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=TechnicianSchema)
def read_technician(id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    technician = db.query(Technician).filter(Technician.id == id).first()
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    return technician

@router.post("/", response_model=TechnicianSchema)
def create_technician(technician_in: TechnicianCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    technician = Technician(**technician_in.model_dump())
    db.add(technician)
    db.commit()
    db.refresh(technician)
    return technician

@router.put("/{id}", response_model=TechnicianSchema)
def update_technician(id: str, technician_in: TechnicianUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    technician = db.query(Technician).filter(Technician.id == id).first()
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    update_data = technician_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(technician, key, value)
        
    db.commit()
    db.refresh(technician)
    return technician

@router.delete("/{id}")
def delete_technician(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    technician = db.query(Technician).filter(Technician.id == id).first()
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found")
    db.delete(technician)
    db.commit()
    return {"success": True}
