// Authentication related functions for the frontend
// This file manages login, registration, logout, token storage, and navigation updates for user authentication

// Checks if the user is currently logged in by calling the backend API
async function checkAuthStatus() {
    try {
        // Send a GET request to the backend to check if the user is authenticated
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            headers: {
                // Attach the saved token for authentication
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            // If authenticated, get user data from the response
            const data = await response.json();
            // Update the navigation bar to show user-specific links
            updateNavigation(data.user);
            return data.user;
        } else {
            // If not authenticated, clear any saved user data and update the nav
            clearUserData();
            updateNavigation(null);
            return null;
        }
    } catch (error) {
        // Handle network or other errors
        console.error('Error checking authentication:', error);
        clearUserData();
        updateNavigation(null);
        return null;
    }
}

// Updates the navigation bar based on whether a user is logged in and their type
function updateNavigation(user) {
    // Get references to navigation elements
    const authNavItem = document.getElementById('auth-nav-item'); // Login/Register
    const logoutNavItem = document.getElementById('logout-nav-item'); // Logout
    const dashboardNavItem = document.getElementById('dashboard-nav-item'); // Dashboard
    const dashboardLink = document.getElementById('dashboard-link'); // Dashboard link
    const prescriptionsNavItem = document.getElementById('prescriptions-nav-item'); // Prescriptions
    const rewardsNavItem = document.getElementById('rewards-nav-item'); // Rewards
    
    if (user) {
        // If user is logged in, show/hide relevant nav items
        if (authNavItem) authNavItem.style.display = 'none';
        if (logoutNavItem) logoutNavItem.style.display = 'block';
        if (dashboardNavItem) dashboardNavItem.style.display = 'block';
        // Set dashboard link based on user type
        if (dashboardLink) {
            if (user.type === 'clinic') {
                dashboardLink.href = '/pages/clinic-dashboard.html';
            } else if (user.type === 'admin') {
                dashboardLink.href = '/pages/admin-rewards.html';
            } else {
                dashboardLink.href = '/pages/patient-dashboard.html';
            }
        }
        // Show extra nav items for patients
        if (user.type === 'patient') {
            if (prescriptionsNavItem) prescriptionsNavItem.style.display = 'block';
            if (rewardsNavItem) rewardsNavItem.style.display = 'block';
        }
    } else {
        // If not logged in, show login/register and hide others
        if (authNavItem) authNavItem.style.display = 'block';
        if (logoutNavItem) logoutNavItem.style.display = 'none';
        if (dashboardNavItem) dashboardNavItem.style.display = 'none';
        if (prescriptionsNavItem) prescriptionsNavItem.style.display = 'none';
        if (rewardsNavItem) rewardsNavItem.style.display = 'none';
    }
}

// Handles user login by sending credentials to the backend
async function login(email, password) {
    try {
        // Send login request to backend
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            // If login fails, show error
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }
        // Parse the response and save user data
        const data = await response.json().catch(err => {
            console.error('Error parsing login response:', err);
            throw new Error('Login failed: Unable to process server response');
        });
        // Save token and user info to local storage
        saveUserData(data.access_token, data.user);
        // Update navigation bar
        updateNavigation(data.user);
        return data.user;
    } catch (error) {
        // Handle errors
        console.error('Login error:', error);
        throw error;
    }
}

// Handles user registration by sending user info to the backend
async function register(userData) {
    try {
        // Send registration request to backend
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            // If registration fails, show error
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
        }
        // Parse the response and save user data
        const data = await response.json().catch(err => {
            console.error('Error parsing registration response:', err);
            throw new Error('Registration failed: Unable to process server response');
        });
        // Save token and user info to local storage
        saveUserData(data.access_token, data.user);
        // Update navigation bar
        updateNavigation(data.user);
        return data.user;
    } catch (error) {
        // Handle errors
        console.error('Registration error:', error);
        throw error;
    }
}

// Logs the user out by clearing their data and redirecting to home
function logout() {
    // Remove user data from local storage
    clearUserData();
    // Update navigation bar
    updateNavigation(null);
    // Redirect to home page
    window.location.href = '/';
}

// Saves the user's token and info to local storage for later use
function saveUserData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Removes user data from local storage (used on logout or failed auth)
function clearUserData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Gets the saved token from local storage
function getToken() {
    return localStorage.getItem('token');
}

// Gets the saved user info from local storage and parses it
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

// Returns true if the logged-in user is a clinic
function isClinic() {
    const user = getUser();
    return user && user.type === 'clinic';
}

// Returns true if the logged-in user is a patient
function isPatient() {
    const user = getUser();
    return user && user.type === 'patient';
}

// Returns true if the logged-in user is an admin (case-insensitive)
function isAdmin() {
    const user = getUser();
    // Check case insensitively for various admin types
    if (!user || !user.type) return false;
    const adminTypes = ['admin', 'administrator', 'system'];
    return adminTypes.some(type => user.type.toLowerCase() === type.toLowerCase());
}

// Helper for making authenticated API requests with the saved token
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
