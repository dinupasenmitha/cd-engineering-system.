from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    standard_price: float = 0.0
    duration_estimate: str = "1h"
    category: str = "General"

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    standard_price: Optional[float] = None
    duration_estimate: Optional[str] = None
    category: Optional[str] = None

class Service(ServiceBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PartBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit_price: float = 0.0
    stock: int = 0

class PartCreate(PartBase):
    pass

class PartUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit_price: Optional[float] = None
    stock: Optional[int] = None

class Part(PartBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
