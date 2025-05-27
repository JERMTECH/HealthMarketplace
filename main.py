# main.py - Entry point for the FastAPI backend

# Import FastAPI and related modules for building the API
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import datetime

# Import database and authentication utilities
from app.database import engine, Base
from app.auth import get_current_user
# Import routers for different API sections
from app.routes import auth, clinics, patients, appointments, products
from app.routes.prescriptions import router as prescriptions_router
from app.routes.rewards import router as rewards_router
from app.routes.reward_config import router as reward_config_router
from app.routes.rewards_admin import router as rewards_admin_router
from app.sample_data import create_initial_data

# Create the FastAPI app instance
app = FastAPI(title="MediMarket API")

# Enable CORS so frontend can access the API (in production, restrict origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables if they don't exist
Base.metadata.create_all(bind=engine)

# Register API routers for different resources
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clinics.router, prefix="/api/clinics", tags=["Clinics"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(prescriptions_router, prefix="/api/prescriptions", tags=["Prescriptions"])
app.include_router(rewards_router, prefix="/api/rewards", tags=["Rewards"])
app.include_router(reward_config_router, prefix="/api/rewards/config", tags=["Reward Configuration"])
app.include_router(rewards_admin_router, prefix="/api/rewards", tags=["Rewards Admin"])

# Special endpoint to support frontend's order API calls
@app.get("/api/orders/patient/{patient_id}")
async def get_patient_orders_alias(patient_id: str, current_user = Depends(get_current_user)):
    # Forward the request to the actual implementation in products router
    from app.routes.products import get_patient_orders
    from app.database import get_db
    db = next(get_db())
    return await get_patient_orders(patient_id=patient_id, db=db, current_user=current_user)

# Startup event: create initial data and ensure admin user exists
@app.on_event("startup")
async def startup_event():
    create_initial_data()
    from app.updates.add_admin_user import add_admin_user
    from app.database import get_db
    from app.auth_fix import fix_admin_user_type
    db = next(get_db())
    add_admin_user(db)
    fix_admin_user_type()

# Health check endpoint for monitoring
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

# Debug endpoint to test clinics routing
@app.get("/api/clinics-debug")
async def get_clinics_debug():
    return {"message": "API is working"}

# Serve static files for the frontend (order matters)
app.mount("/css", StaticFiles(directory="public/css"), name="css")
app.mount("/js", StaticFiles(directory="public/js"), name="js")
app.mount("/pages", StaticFiles(directory="public/pages", html=True), name="pages")
app.mount("/", StaticFiles(directory="public", html=True), name="root")

# Run the app with Uvicorn if this file is executed directly
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)