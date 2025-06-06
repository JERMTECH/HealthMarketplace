import requests
import json

BASE_URL = "http://localhost:5000"

def test_clinics_api():
    """Test the clinics API endpoints"""
    print("Testing clinics API...")
    
    # Skip the get all clinics test for now
    # Instead, start with featured clinics to get a clinic ID
    response = requests.get(f"{BASE_URL}/api/clinics/featured")
    if response.status_code == 200:
        clinics = response.json()
        print(f"✅ Found {len(clinics)} featured clinics")
        
        # Save first clinic id for other tests
        if clinics:
            clinic_id = clinics[0]["id"]
            
            # Test get clinic by id
            response = requests.get(f"{BASE_URL}/api/clinics/{clinic_id}")
            if response.status_code == 200:
                clinic = response.json()
                print(f"✅ Got clinic: {clinic['name']}")
            else:
                print(f"❌ Failed to get clinic by id: {response.status_code}")
                
            # Test get clinic services
            response = requests.get(f"{BASE_URL}/api/clinics/{clinic_id}/services")
            if response.status_code == 200:
                services = response.json()
                print(f"✅ Found {len(services)} services for clinic")
            else:
                print(f"❌ Failed to get clinic services: {response.status_code}")
    else:
        print(f"❌ Failed to get featured clinics: {response.status_code}")
        
def test_products_api():
    """Test the products API endpoints"""
    print("\nTesting products API...")
    
    # Skip the get all products test for now
    # Test get product categories directly
    response = requests.get(f"{BASE_URL}/api/products/categories")
    if response.status_code == 200:
        categories = response.json()
        print(f"✅ Found product categories: {categories}")
    else:
        print(f"❌ Failed to get product categories: {response.status_code}")
        
    # Get a clinic ID from the featured clinics endpoint
    response = requests.get(f"{BASE_URL}/api/clinics/featured")
    if response.status_code == 200:
        clinics = response.json()
        if clinics:
            clinic_id = clinics[0]["id"]
            
            # Test get products by clinic
            response = requests.get(f"{BASE_URL}/api/products/clinic/{clinic_id}")
            if response.status_code == 200:
                clinic_products = response.json()
                print(f"✅ Found {len(clinic_products)} products for clinic")
            else:
                print(f"❌ Failed to get clinic products: {response.status_code}")
    else:
        print(f"❌ Failed to get clinics for product test: {response.status_code}")

def test_auth_flow():
    """Test the authentication flow"""
    print("\nTesting authentication flow...")
    
    # Try to login with sample data credentials
    login_data = {
        "username": "cityhealthclinic@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/token", data=login_data)
    if response.status_code == 200:
        token_data = response.json()
        print(f"✅ Login successful, received token")
        
        # Test current user endpoint with token
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if response.status_code == 200:
            user = response.json()
            print(f"✅ Got current user: {user['name']}")
            return headers, user
        else:
            print(f"❌ Failed to get current user: {response.status_code}")
    else:
        print(f"❌ Login failed: {response.status_code}")
        if response.status_code == 422:
            print("Validation error, check username/password format")
        else:
            print(response.text)
    
    return None, None

def test_patient_appointments(headers, user):
    """Test patient appointments API"""
    if not headers or user["type"] != "patient":
        print("\nSkipping patient appointments test (need patient user)")
        return
        
    print("\nTesting patient appointments API...")
    patient_id = user["id"]
    
    # Get patient appointments
    response = requests.get(f"{BASE_URL}/api/appointments/patient/{patient_id}", 
                           headers=headers)
    if response.status_code == 200:
        appointments = response.json()
        print(f"✅ Found {len(appointments)} appointments for patient")
    else:
        print(f"❌ Failed to get patient appointments: {response.status_code}")

def test_patient_prescriptions(headers, user):
    """Test patient prescriptions API"""
    if not headers or user["type"] != "patient":
        print("\nSkipping patient prescriptions test (need patient user)")
        return
        
    print("\nTesting patient prescriptions API...")
    patient_id = user["id"]
    
    # Get patient prescriptions
    response = requests.get(f"{BASE_URL}/api/prescriptions/patient/{patient_id}", 
                           headers=headers)
    if response.status_code == 200:
        prescriptions = response.json()
        print(f"✅ Found {len(prescriptions)} prescriptions for patient")
    else:
        print(f"❌ Failed to get patient prescriptions: {response.status_code}")
        
def test_rewards_system(headers, user):
    """Test rewards system API"""
    if not headers:
        print("\nSkipping rewards system test (need authenticated user)")
        return
        
    print("\nTesting rewards system API...")
    
    # Get rewards info
    response = requests.get(f"{BASE_URL}/api/rewards/info")
    if response.status_code == 200:
        info = response.json()
        print(f"✅ Got rewards system info")
    else:
        print(f"❌ Failed to get rewards info: {response.status_code}")
    
    if user["type"] == "patient":
        # Get patient rewards
        patient_id = user["id"]
        response = requests.get(f"{BASE_URL}/api/rewards/patient/{patient_id}", 
                               headers=headers)
        if response.status_code == 200:
            rewards = response.json()
            print(f"✅ Got patient rewards info")
        else:
            print(f"❌ Failed to get patient rewards: {response.status_code}")

def test_clinic_appointments(headers, user):
    """Test clinic appointments API"""
    if not headers or user["type"] != "clinic":
        print("\nSkipping clinic appointments test (need clinic user)")
        return
    
    print("\nTesting clinic appointments API...")
    clinic_id = user["id"]
    
    # Get clinic appointments
    response = requests.get(f"{BASE_URL}/api/appointments/clinic/{clinic_id}", headers=headers)
    if response.status_code == 200:
        appointments = response.json()
        print(f"✅ Found {len(appointments)} appointments for clinic")
    else:
        print(f"❌ Failed to get clinic appointments: {response.status_code}")

if __name__ == "__main__":
    print("Running API tests for MediMarket...\n")
    
    # Test basic endpoints that don't require auth
    test_clinics_api()
    test_products_api()
    
    # Test auth flow and get token
    headers, user = test_auth_flow()
    
    # Test endpoints that require auth
    if headers:
        test_patient_appointments(headers, user)
        test_clinic_appointments(headers, user)
        test_patient_prescriptions(headers, user)
        test_rewards_system(headers, user)
        
    print("\nAPI tests completed!")