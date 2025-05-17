/**
 * MediMarket Mobile API Client
 * Handles all API interactions for the mobile app
 */

// API base URL - change this for production
const API_BASE_URL = '/api';

/**
 * Generic API call function with authentication
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise with response data
 */
async function apiCall(endpoint, options = {}) {
    // Get authentication token if it exists
    const token = localStorage.getItem('token');
    
    // Set up default headers
    const headers = {
        ...(options.headers || {}),
    };
    
    // Add auth token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Build full URL
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        // Make request
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Handle unauthorized errors
        if (response.status === 401) {
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('userType');
            localStorage.removeItem('userId');
            
            // Redirect to login page if not already there
            if (!window.location.href.includes('login.html')) {
                window.location.href = '../pages/login.html';
            }
            
            throw new Error('Unauthorized');
        }
        
        // Handle bad requests and server errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'API request failed');
        }
        
        // Parse JSON response or return empty object
        return await response.json().catch(() => ({}));
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Authentication API
 */
const AuthAPI = {
    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Promise with auth token
     */
    login: async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        return fetch(`${API_BASE_URL}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error('Login failed');
            }
            return response.json();
        });
    },
    
    /**
     * Register new user
     * @param {Object} userData - User data
     * @returns {Promise} - Promise with created user
     */
    register: async (userData) => {
        return apiCall('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
    },
    
    /**
     * Check if user is authenticated
     * @returns {Promise} - Promise with user data
     */
    checkStatus: async () => {
        return apiCall('/auth/check');
    },
    
    /**
     * Get user profile
     * @returns {Promise} - Promise with user profile data
     */
    getProfile: async () => {
        return apiCall('/auth/me');
    }
};

/**
 * Clinics API
 */
const ClinicsAPI = {
    /**
     * Get all clinics
     * @returns {Promise} - Promise with clinics list
     */
    getAllClinics: async () => {
        return apiCall('/clinics/all');
    },
    
    /**
     * Get featured clinics
     * @returns {Promise} - Promise with featured clinics list
     */
    getFeaturedClinics: async () => {
        return apiCall('/clinics/featured');
    },
    
    /**
     * Get single clinic details
     * @param {string} clinicId - Clinic ID
     * @returns {Promise} - Promise with clinic details
     */
    getClinic: async (clinicId) => {
        return apiCall(`/clinics/${clinicId}`);
    },
    
    /**
     * Get clinic services
     * @param {string} clinicId - Clinic ID
     * @returns {Promise} - Promise with clinic services
     */
    getClinicServices: async (clinicId) => {
        return apiCall(`/clinics/${clinicId}/services`);
    }
};

/**
 * Appointments API
 */
const AppointmentsAPI = {
    /**
     * Get all appointments for user
     * @returns {Promise} - Promise with appointments list
     */
    getAppointments: async () => {
        return apiCall('/appointments');
    },
    
    /**
     * Create new appointment
     * @param {Object} appointmentData - Appointment data
     * @returns {Promise} - Promise with created appointment
     */
    createAppointment: async (appointmentData) => {
        return apiCall('/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
    },
    
    /**
     * Update appointment status
     * @param {string} appointmentId - Appointment ID
     * @param {Object} updateData - Status update data
     * @returns {Promise} - Promise with updated appointment
     */
    updateAppointmentStatus: async (appointmentId, updateData) => {
        return apiCall(`/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
    }
};

/**
 * Products API
 */
const ProductsAPI = {
    /**
     * Get all products
     * @param {string} category - Optional category filter
     * @returns {Promise} - Promise with products list
     */
    getProducts: async (category = null) => {
        const endpoint = category 
            ? `/products/all?category=${encodeURIComponent(category)}`
            : '/products/all';
        return apiCall(endpoint);
    },
    
    /**
     * Get product categories
     * @returns {Promise} - Promise with categories list
     */
    getCategories: async () => {
        return apiCall('/products/categories');
    },
    
    /**
     * Create order
     * @param {Object} orderData - Order data
     * @returns {Promise} - Promise with order details
     */
    createOrder: async (orderData) => {
        return apiCall('/products/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
    }
};

/**
 * Prescriptions API
 */
const PrescriptionsAPI = {
    /**
     * Get all prescriptions
     * @returns {Promise} - Promise with prescriptions list
     */
    getPrescriptions: async () => {
        return apiCall('/prescriptions');
    },
    
    /**
     * Get prescription details
     * @param {string} prescriptionId - Prescription ID
     * @returns {Promise} - Promise with prescription details
     */
    getPrescription: async (prescriptionId) => {
        return apiCall(`/prescriptions/${prescriptionId}`);
    }
};

/**
 * Rewards API
 */
const RewardsAPI = {
    /**
     * Get rewards information
     * @returns {Promise} - Promise with rewards info
     */
    getRewardsInfo: async () => {
        return apiCall('/rewards/info');
    },
    
    /**
     * Get patient rewards
     * @returns {Promise} - Promise with patient rewards
     */
    getPatientRewards: async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return apiCall(`/rewards/patients/${userId}`);
    },
    
    /**
     * Request rewards card
     * @returns {Promise} - Promise with rewards card details
     */
    requestRewardsCard: async () => {
        return apiCall('/rewards/request-card', {
            method: 'POST'
        });
    },
    
    /**
     * Get partner shops
     * @returns {Promise} - Promise with partner shops list
     */
    getPartnerShops: async () => {
        return apiCall('/rewards/partner-shops');
    }
};

// Export API modules
window.MediMarketAPI = {
    Auth: AuthAPI,
    Clinics: ClinicsAPI,
    Appointments: AppointmentsAPI,
    Products: ProductsAPI,
    Prescriptions: PrescriptionsAPI,
    Rewards: RewardsAPI
};