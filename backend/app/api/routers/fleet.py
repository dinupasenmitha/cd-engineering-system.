from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Lorry
from app.schemas.fleet import Lorry as LorrySchema, LorryCreate, LorryUpdate
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[LorrySchema])
def read_lorries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Lorry).offset(skip).limit(limit).all()

@router.post("/", response_model=LorrySchema)
def create_lorry(lorry_in: LorryCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    lorry = Lorry(**lorry_in.model_dump())
    db.add(lorry)
    db.commit()
    db.refresh(lorry)
    return lorry

@router.put("/{id}", response_model=LorrySchema)
def update_lorry(id: str, lorry_in: LorryUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    lorry = db.query(Lorry).filter(Lorry.id == id).first()
    if not lorry:
        raise HTTPException(status_code=404, detail="Lorry not found")
    
    update_data = lorry_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lorry, key, value)
        
    db.commit()
    db.refresh(lorry)
    return lorry

@router.delete("/{id}")
def delete_lorry(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    lorry = db.query(Lorry).filter(Lorry.id == id).first()
    if not lorry:
        raise HTTPException(status_code=404, detail="Lorry not found")
    db.delete(lorry)
    db.commit()
    return {"success": True}
