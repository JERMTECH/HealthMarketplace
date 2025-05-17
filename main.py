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
# Main products router
app.include_router(products.router, prefix="/api/products", tags=["Products"])

# Set up an additional route for orders to support the frontend's current API calls
@app.get("/api/orders/patient/{patient_id}")
async def get_patient_orders_alias(patient_id: str, current_user = Depends(get_current_user)):
    # This endpoint simply forwards the request to the actual implementation
    from app.routes.products import get_patient_orders
    from app.database import get_db
    # Get a database session
    db = next(get_db())
    # Call the actual implementation
    return await get_patient_orders(patient_id=patient_id, db=db, current_user=current_user)
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

# Add a specific API route for the clinics endpoint for debugging
@app.get("/api/clinics-debug")
async def get_clinics_debug():
    """Debug endpoint to test clinics routing."""
    return {"message": "API is working"}

# Mount static files - IMPORTANT: The order matters here
# API routes should be registered before mounting static files
# Mount the static file directories first to avoid conflict with API routes
app.mount("/css", StaticFiles(directory="public/css"), name="css")
app.mount("/js", StaticFiles(directory="public/js"), name="js")
app.mount("/pages", StaticFiles(directory="public/pages", html=True), name="pages")
# Mount the root last
app.mount("/", StaticFiles(directory="public", html=True), name="root")

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))
    
    # Run the application
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)