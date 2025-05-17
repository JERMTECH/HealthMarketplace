// Authentication related functions

// Check if the user is logged in
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update UI based on authentication status
            updateNavigation(data.user);
            
            return data.user;
        } else {
            // If not authenticated, clear token
            clearUserData();
            updateNavigation(null);
            return null;
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        clearUserData();
        updateNavigation(null);
        return null;
    }
}

// Update navigation based on user type
function updateNavigation(user) {
    const authNavItem = document.getElementById('auth-nav-item');
    const logoutNavItem = document.getElementById('logout-nav-item');
    const dashboardNavItem = document.getElementById('dashboard-nav-item');
    const dashboardLink = document.getElementById('dashboard-link');
    const prescriptionsNavItem = document.getElementById('prescriptions-nav-item');
    const rewardsNavItem = document.getElementById('rewards-nav-item');
    
    if (user) {
        // User is logged in
        if (authNavItem) authNavItem.style.display = 'none';
        if (logoutNavItem) logoutNavItem.style.display = 'block';
        if (dashboardNavItem) dashboardNavItem.style.display = 'block';
        
        // Set dashboard link based on user type
        if (dashboardLink) {
            if (user.type === 'clinic') {
                dashboardLink.href = '/pages/clinic-dashboard.html';
            } else {
                dashboardLink.href = '/pages/patient-dashboard.html';
            }
        }
        
        // Show additional navigation items for patients
        if (user.type === 'patient') {
            if (prescriptionsNavItem) prescriptionsNavItem.style.display = 'block';
            if (rewardsNavItem) rewardsNavItem.style.display = 'block';
        }
    } else {
        // User is not logged in
        if (authNavItem) authNavItem.style.display = 'block';
        if (logoutNavItem) logoutNavItem.style.display = 'none';
        if (dashboardNavItem) dashboardNavItem.style.display = 'none';
        if (prescriptionsNavItem) prescriptionsNavItem.style.display = 'none';
        if (rewardsNavItem) rewardsNavItem.style.display = 'none';
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }
        
        const data = await response.json().catch(err => {
            console.error('Error parsing login response:', err);
            throw new Error('Login failed: Unable to process server response');
        });
        
        // Save token and user data
        saveUserData(data.access_token, data.user);
        
        // Update UI
        updateNavigation(data.user);
        
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Register function
async function register(userData) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
        }
        
        const data = await response.json().catch(err => {
            console.error('Error parsing registration response:', err);
            throw new Error('Registration failed: Unable to process server response');
        });
        
        // Save token and user data
        saveUserData(data.access_token, data.user);
        
        // Update UI
        updateNavigation(data.user);
        
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    // Clear user data from local storage
    clearUserData();
    
    // Update UI
    updateNavigation(null);
    
    // Redirect to home page
    window.location.href = '/';
}

// Save user data and token
function saveUserData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Clear user data
function clearUserData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Get user data from localStorage
function getUser() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}

// Check if user is a clinic
function isClinic() {
    const user = getUser();
    return user && user.type === 'clinic';
}

// Check if user is a patient
function isPatient() {
    const user = getUser();
    return user && user.type === 'patient';
}

// Add authorization header to fetch requests
function authorizedFetch(url, options = {}) {
    const token = getToken();
    
    if (!options.headers) {
        options.headers = {};
    }
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('No auth token found for request:', url);
    }
    
    return fetch(url, options);
}
