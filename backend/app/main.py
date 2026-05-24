from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine, Base

from app.api.routers import auth, customers, fleet, technicians, catalog, jobs, invoices, documents

# Create database tables (in production, use Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["auth"])
app.include_router(customers.router, prefix=settings.API_V1_STR + "/customers", tags=["customers"])
app.include_router(fleet.router, prefix=settings.API_V1_STR + "/lorries", tags=["fleet"])
app.include_router(technicians.router, prefix=settings.API_V1_STR + "/technicians", tags=["technicians"])
app.include_router(catalog.router, prefix=settings.API_V1_STR, tags=["catalog"]) # Handles /parts and /services
app.include_router(jobs.router, prefix=settings.API_V1_STR + "/jobs", tags=["jobs"])
app.include_router(invoices.router, prefix=settings.API_V1_STR + "/invoices", tags=["invoices"])
app.include_router(documents.router, prefix=settings.API_V1_STR + "/documents", tags=["documents"])
