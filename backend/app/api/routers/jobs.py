from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Job, JobHistory, Invoice, JobPart, Part
from app.schemas.job import Job as JobSchema, JobCreate, JobUpdate, JobPartCreate
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

def generate_job_number(db: Session) -> str:
    count = db.query(Job).count()
    return f"JOB-{1001 + count}"

@router.get("/", response_model=List[JobSchema])
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Job).order_by(Job.date.desc()).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=JobSchema)
def read_job(id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/", response_model=JobSchema)
def create_job(job_in: JobCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job_number = generate_job_number(db)
    job = Job(**job_in.model_dump(), job_number=job_number)
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Add history
    history = JobHistory(job_id=job.id, status=job.status, notes="Job created", updated_by=current_user.username)
    db.add(history)
    db.commit()
    
    return job

@router.put("/{id}", response_model=JobSchema)
def update_job(id: str, job_in: JobUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    old_status = job.status
    update_data = job_in.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(job, key, value)
        
    if "status" in update_data and update_data["status"] != old_status:
        history = JobHistory(job_id=job.id, status=job.status, notes="Status updated", updated_by=current_user.username)
        db.add(history)
        
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{id}")
def delete_job(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"success": True}

@router.post("/{id}/parts")
def add_job_part(id: str, part_in: JobPartCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    part = db.query(Part).filter(Part.id == part_in.part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
        
    if part.stock < part_in.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
        
    job_part = JobPart(job_id=id, part_id=part.id, quantity=part_in.quantity, unit_price=part.unit_price)
    db.add(job_part)
    
    # Update stock and job cost
    part.stock -= part_in.quantity
    job.parts_cost += (part_in.quantity * part.unit_price)
    
    db.commit()
    return {"success": True}
