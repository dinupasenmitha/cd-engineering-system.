from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TechnicianBase(BaseModel):
    name: str
    phone: str
    specialization: Optional[str] = None
    role: str = "Junior"
    lorry_id: Optional[str] = None

class TechnicianCreate(TechnicianBase):
    pass

class TechnicianUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    role: Optional[str] = None
    lorry_id: Optional[str] = None

class Technician(TechnicianBase):
    id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
