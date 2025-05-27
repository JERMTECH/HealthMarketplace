// Main application JavaScript file for the frontend
// This file handles global UI setup, authentication checks, and homepage logic
// It is loaded on every page and provides shared utilities and event handlers

// When the page loads, run this code
// This ensures all DOM elements are ready before we try to use them
// Also initializes icons, checks login status, and loads homepage clinics
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons (for pretty SVG icons)
    if (window.feather) {
        feather.replace();
    }
    
    // Check if the user is logged in and update the navigation bar
    checkAuthStatus();
    
    // Add a click event to the logout button (if it exists)
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', logout);
    }
    
    // If we're on the homepage, load featured clinics
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadFeaturedClinics();
    }
});

// Loads and displays featured clinics on the homepage
// Fetches data from the backend and updates the UI
async function loadFeaturedClinics() {
    try {
        const response = await fetch('/api/clinics/featured');
        
        if (!response.ok) {
            throw new Error('Failed to fetch featured clinics');
        }
        
        const clinics = await response.json();
        const featuredClinicsContainer = document.getElementById('featured-clinics');
        
        if (featuredClinicsContainer) {
            // Clear loading spinner
            featuredClinicsContainer.innerHTML = '';
            
            if (clinics.length === 0) {
                // If no clinics, show a friendly message
                featuredClinicsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="empty-state">
                            <i data-feather="package"></i>
                            <h4>No clinics available yet</h4>
                            <p>Be the first to register your clinic on our platform!</p>
                            <a href="/pages/register.html?type=clinic" class="btn btn-primary">Register Clinic</a>
                        </div>
                    </div>
                `;
                if (window.feather) {
                    feather.replace();
                }
                return;
            }
            
            // For each clinic, create a card and add it to the page
            clinics.forEach(clinic => {
                const clinicCard = document.createElement('div');
                clinicCard.className = 'col-md-4 mb-4';
                clinicCard.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${escapeHtml(clinic.name)}</h5>
                            <p class="card-text">${escapeHtml(clinic.specialization || 'General Healthcare')}</p>
                            <p class="card-text"><small class="text-muted"><i data-feather="map-pin" class="feather-sm"></i> ${escapeHtml(clinic.location)}</small></p>
                            <a href="/pages/appointments.html?clinicId=${clinic.id}" class="btn btn-sm btn-outline-primary">Book Appointment</a>
                        </div>
                    </div>
                `;
                featuredClinicsContainer.appendChild(clinicCard);
            });
            
            // Re-initialize Feather icons for new content
            if (window.feather) {
                feather.replace();
            }
        }
    } catch (error) {
        // If there's an error, show a message to the user
        console.error('Error loading featured clinics:', error);
        const featuredClinicsContainer = document.getElementById('featured-clinics');
        if (featuredClinicsContainer) {
            featuredClinicsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger" role="alert">
                        Error loading clinics. Please try again later.
                    </div>
                </div>
            `;
        }
    }
}

// Escapes HTML to prevent XSS attacks when displaying user data
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show an error message in the UI (auto-hides after 5 seconds)
function showError(message, elementId = 'error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
    }
}

// Show a success message in the UI (auto-hides after 5 seconds)
function showSuccess(message, elementId = 'success-message') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    } else {
        console.log(message);
    }
}

// Format a date string into a readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format a number as currency (USD)
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Get a URL parameter by name
function getUrlParam(param) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(param);
}

// Set a button to a loading state (shows spinner)
function setLoading(elementId, isLoading) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isLoading) {
        element.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> Loading...';
        element.disabled = true;
    } else {
        // Restore original text
        const originalText = element.getAttribute('data-original-text') || 'Submit';
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

// Store the original text for all submit buttons (for loading state)
function initLoadingButtons() {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        if (!button.getAttribute('data-original-text')) {
            button.setAttribute('data-original-text', button.innerHTML);
        }
    });
}

// When the DOM is loaded, initialize loading buttons
document.addEventListener('DOMContentLoaded', initLoadingButtons);
