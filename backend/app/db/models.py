import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="staff")
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = relationship("Job", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")

class Lorry(Base):
    __tablename__ = "lorries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lorry_number = Column(String(50), unique=True, index=True, nullable=False)
    assigned_area = Column(String(100), nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="lorry")
    technicians = relationship("Technician", back_populates="lorry")

class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    standard_price = Column(Float, default=0.0)
    duration_estimate = Column(String(50), default="1h")
    category = Column(String(50), default="General")
    created_at = Column(DateTime, default=datetime.utcnow)

class Part(Base):
    __tablename__ = "parts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    unit_price = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Technician(Base):
    __tablename__ = "technicians"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    specialization = Column(String(100), nullable=True)
    role = Column(String(50), default="Junior")
    lorry_id = Column(String(36), ForeignKey("lorries.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lorry = relationship("Lorry", back_populates="technicians")
    jobs = relationship("Job", back_populates="technician")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=True)
    lorry_id = Column(String(36), ForeignKey("lorries.id"), nullable=True)
    service_type = Column(String(50), default="Repair")
    description = Column(Text, nullable=True)
    technician_id = Column(String(36), ForeignKey("technicians.id"), nullable=True)
    status = Column(String(50), default="Pending")
    date = Column(String(50), nullable=False)
    
    parts_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    overhead_percent = Column(Float, default=10.0)
    profit_percent = Column(Float, default=30.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="jobs")
    lorry = relationship("Lorry", back_populates="jobs")
    technician = relationship("Technician", back_populates="jobs")
    parts = relationship("JobPart", back_populates="job", cascade="all, delete-orphan")
    history = relationship("JobHistory", back_populates="job", cascade="all, delete-orphan")
    invoice = relationship("Invoice", uselist=False, back_populates="job")

class JobPart(Base):
    __tablename__ = "job_parts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    part_id = Column(String(36), ForeignKey("parts.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="parts")
    part = relationship("Part")

class JobHistory(Base):
    __tablename__ = "job_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    updated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="history")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    
    parts_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    overhead_percent = Column(Float, default=10.0)
    profit_percent = Column(Float, default=30.0)
    
    subtotal = Column(Float, default=0.0)
    overhead_amount = Column(Float, default=0.0)
    profit_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    status = Column(String(50), default="Unpaid")
    finalized = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="invoice")
    customer = relationship("Customer", back_populates="invoices")

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    quotation_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True)
    
    parts_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    overhead_percent = Column(Float, default=10.0)
    profit_percent = Column(Float, default=30.0)
    
    subtotal = Column(Float, default=0.0)
    overhead_amount = Column(Float, default=0.0)
    profit_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SignedDocument(Base):
    __tablename__ = "signed_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    document_type = Column(String(50), default="job_sheet")
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)
    uploaded_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
