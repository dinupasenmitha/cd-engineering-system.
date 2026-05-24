from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class DocumentBase(BaseModel):
    job_id: str
    customer_id: str
    document_type: str = "job_sheet"
    notes: Optional[str] = None

class Document(DocumentBase):
    id: str
    filename: str
    original_name: str
    mime_type: str
    file_size: int
    uploaded_by: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
