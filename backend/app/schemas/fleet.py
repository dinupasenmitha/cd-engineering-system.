from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class LorryBase(BaseModel):
    lorry_number: str
    assigned_area: Optional[str] = None
    status: str = "Active"

class LorryCreate(LorryBase):
    pass

class LorryUpdate(BaseModel):
    lorry_number: Optional[str] = None
    assigned_area: Optional[str] = None
    status: Optional[str] = None

class Lorry(LorryBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
