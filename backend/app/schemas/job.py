from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class JobPartBase(BaseModel):
    part_id: str
    quantity: int = 1

class JobPartCreate(JobPartBase):
    pass

class JobPart(JobPartBase):
    id: str
    job_id: str
    unit_price: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JobHistoryBase(BaseModel):
    status: str
    notes: Optional[str] = None
    
class JobHistory(JobHistoryBase):
    id: str
    job_id: str
    updated_by: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JobBase(BaseModel):
    customer_id: str
    service_id: Optional[str] = None
    lorry_id: Optional[str] = None
    service_type: str = "Repair"
    description: Optional[str] = None
    technician_id: Optional[str] = None
    status: str = "Pending"
    date: str
    parts_cost: float = 0.0
    labor_cost: float = 0.0
    transport_cost: float = 0.0
    overhead_percent: float = 10.0
    profit_percent: float = 30.0

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    customer_id: Optional[str] = None
    service_id: Optional[str] = None
    lorry_id: Optional[str] = None
    service_type: Optional[str] = None
    description: Optional[str] = None
    technician_id: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    parts_cost: Optional[float] = None
    labor_cost: Optional[float] = None
    transport_cost: Optional[float] = None
    overhead_percent: Optional[float] = None
    profit_percent: Optional[float] = None

class Job(JobBase):
    id: str
    job_number: str
    created_at: datetime
    updated_at: datetime
    parts: List[JobPart] = []
    history: List[JobHistory] = []
    model_config = ConfigDict(from_attributes=True)
