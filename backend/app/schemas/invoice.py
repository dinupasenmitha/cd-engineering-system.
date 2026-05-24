from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class InvoiceBase(BaseModel):
    job_id: str
    customer_id: str
    parts_cost: float = 0.0
    labor_cost: float = 0.0
    transport_cost: float = 0.0
    overhead_percent: float = 10.0
    profit_percent: float = 30.0

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    finalized: Optional[bool] = None

class Invoice(InvoiceBase):
    id: str
    invoice_number: str
    subtotal: float
    overhead_amount: float
    profit_amount: float
    total: float
    status: str
    finalized: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
