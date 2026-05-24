import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import SignedDocument
from app.schemas.document import Document as DocumentSchema
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

@router.post("/upload", response_model=DocumentSchema)
def upload_document(
    job_id: str = Form(...),
    customer_id: str = Form(...),
    document_type: str = Form("job_sheet"),
    notes: Optional[str] = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = SignedDocument(
        job_id=job_id,
        customer_id=customer_id,
        document_type=document_type,
        filename=filename,
        original_name=file.filename,
        mime_type=file.content_type,
        file_size=os.path.getsize(filepath),
        uploaded_by=current_user.username,
        notes=notes
    )
    
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/", response_model=List[DocumentSchema])
def get_documents(jobId: Optional[str] = None, customerId: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(SignedDocument)
    if jobId:
        query = query.filter(SignedDocument.job_id == jobId)
    if customerId:
        query = query.filter(SignedDocument.customer_id == customerId)
    return query.order_by(SignedDocument.created_at.desc()).all()

@router.get("/{id}/file")
def get_document_file(id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    doc = db.query(SignedDocument).filter(SignedDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    filepath = os.path.join(settings.UPLOAD_DIR, doc.filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(filepath, media_type=doc.mime_type, filename=doc.original_name)

@router.delete("/{id}")
def delete_document(id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    doc = db.query(SignedDocument).filter(SignedDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    filepath = os.path.join(settings.UPLOAD_DIR, doc.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        
    db.delete(doc)
    db.commit()
    return {"success": True}
