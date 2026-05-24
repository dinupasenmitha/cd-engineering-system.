from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Invoice, Job
from app.schemas.invoice import Invoice as InvoiceSchema, InvoiceCreate, InvoiceUpdate
from app.api.dependencies import get_current_user, require_admin

router = APIRouter()

def generate_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count()
    return f"INV-{1001 + count}"

@router.get("/", response_model=List[InvoiceSchema])
def read_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Invoice).order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=InvoiceSchema)
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    existing = db.query(Invoice).filter(Invoice.job_id == invoice_in.job_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Invoice already exists for this job")
        
    subtotal = invoice_in.parts_cost + invoice_in.labor_cost + invoice_in.transport_cost
    overhead_amount = subtotal * (invoice_in.overhead_percent / 100)
    profit_amount = subtotal * (invoice_in.profit_percent / 100)
    total = subtotal + overhead_amount + profit_amount
    
    invoice_number = generate_invoice_number(db)
    
    invoice = Invoice(
        **invoice_in.model_dump(),
        invoice_number=invoice_number,
        subtotal=subtotal,
        overhead_amount=overhead_amount,
        profit_amount=profit_amount,
        total=total
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.put("/{id}", response_model=InvoiceSchema)
def update_invoice(id: str, invoice_in: InvoiceUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.finalized and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot modify finalized invoice. Admin access required.")
        
    if invoice_in.status == "Paid" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can mark invoices as paid.")
        
    update_data = invoice_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "Paid":
        update_data["finalized"] = True
        
    for key, value in update_data.items():
        setattr(invoice, key, value)
        
    db.commit()
    db.refresh(invoice)
    return invoice
