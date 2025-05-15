from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import datetime

from app.database import engine, Base
from app.auth import get_current_user
# Import routers
from app.routes import auth, clinics, patients, appointments, products
# These routers are created now
from app.routes.prescriptions import router as prescriptions_router
from app.routes.rewards import router as rewards_router
# Import sample data creation function
from app.sample_data import create_initial_data

# Create the FastAPI app
app = FastAPI(title="MediMarket API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should specify the allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clinics.router, prefix="/api/clinics", tags=["Clinics"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(prescriptions_router, prefix="/api/prescriptions", tags=["Prescriptions"])
app.include_router(rewards_router, prefix="/api/rewards", tags=["Rewards"])

# Create sample data
@app.on_event("startup")
async def startup_event():
    create_initial_data()

@app.get("/api/health")
async def health_check():
    """Health check endpoint returning system status."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "endpoints": {
            "auth": "/api/auth",
            "clinics": "/api/clinics",
            "patients": "/api/patients",
            "appointments": "/api/appointments",
            "products": "/api/products",
            "prescriptions": "/api/prescriptions",
            "rewards": "/api/rewards"
        }
    }

# Mount static files - IMPORTANT: This must be the last route to be added
app.mount("/", StaticFiles(directory="public", html=True), name="static")

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))
    
    # Run the application
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)