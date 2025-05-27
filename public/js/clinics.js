// Manages the clinics listing page for the frontend
// Loads and displays a list of clinics, supports searching/filtering, and navigation to clinic details

// Clinics functionality

document.addEventListener('DOMContentLoaded', function() {
    // Load featured clinics on homepage
    if (document.getElementById('featured-clinics')) {
        loadFeaturedClinics();
    }
    
    // Load all clinics on clinics page
    if (document.getElementById('all-clinics')) {
        loadAllClinics();
    }
    
    // Load clinic details if on clinic detail page
    const clinicIdParam = new URLSearchParams(window.location.search).get('id');
    if (clinicIdParam && document.getElementById('clinic-details')) {
        loadClinicDetails(clinicIdParam);
    }
});

// Load featured clinics for homepage
function loadFeaturedClinics() {
    const container = document.getElementById('featured-clinics');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch featured clinics
    fetch('/api/clinics/featured')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(clinics => {
            if (clinics.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">No featured clinics available at the moment.</p>
                    </div>
                `;
                return;
            }
            
            // Clear the container
            container.innerHTML = '';
            
            // Display each clinic
            clinics.forEach(clinic => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${clinic.name}</h5>
                            <p class="card-text text-muted">${clinic.specialization || 'General Healthcare'}</p>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i data-feather="map-pin" class="feather-small"></i> 
                                    ${clinic.location || clinic.address || 'Location not specified'}
                                </small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="btn-group">
                                    <a href="pages/appointments.html?clinic=${clinic.id}" class="btn btn-sm btn-primary">Book Appointment</a>
                                    <a href="pages/clinic-details.html?id=${clinic.id}" class="btn btn-sm btn-outline-secondary">View Details</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            
            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        })
        .catch(error => {
            console.error('Error loading featured clinics:', error);
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-danger">Failed to load clinics. Please try again later.</p>
                </div>
            `;
        });
}

// Load all clinics
function loadAllClinics() {
    const container = document.getElementById('all-clinics');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Use the all clinics endpoint
    fetch('/api/clinics/all')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(clinics => {
            if (clinics.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">No clinics available at the moment.</p>
                    </div>
                `;
                return;
            }
            
            // Clear the container
            container.innerHTML = '';
            
            // Display each clinic
            clinics.forEach(clinic => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${clinic.name}</h5>
                            <p class="card-text text-muted">${clinic.specialization || 'General Healthcare'}</p>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i data-feather="map-pin" class="feather-small"></i> 
                                    ${clinic.location || clinic.address || 'Location not specified'}
                                </small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="btn-group">
                                    <a href="appointments.html?clinic=${clinic.id}" class="btn btn-sm btn-primary">Book Appointment</a>
                                    <a href="clinic-details.html?id=${clinic.id}" class="btn btn-sm btn-outline-secondary">View Details</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            
            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        })
        .catch(error => {
            console.error('Error loading clinics:', error);
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-danger">Failed to load clinics. Please try again later.</p>
                </div>
            `;
        });
}

// Load clinic details
function loadClinicDetails(clinicId) {
    const container = document.getElementById('clinic-details');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch clinic details
    fetch(`/api/clinics/${clinicId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(clinic => {
            // Populate clinic details
            container.innerHTML = `
                <div class="card shadow-sm mb-4">
                    <div class="card-body">
                        <h3 class="card-title">${clinic.name}</h3>
                        <p class="text-muted">${clinic.specialization || 'General Healthcare'}</p>
                        
                        <div class="mb-3">
                            <h5>Contact Information</h5>
                            <p>
                                <i data-feather="mail" class="feather-small"></i> ${clinic.email}<br>
                                <i data-feather="phone" class="feather-small"></i> ${clinic.phone || 'Not provided'}<br>
                                <i data-feather="map-pin" class="feather-small"></i> ${clinic.address || clinic.location || 'Not provided'}
                            </p>
                        </div>
                        
                        <div class="mb-3">
                            <h5>Services</h5>
                            <div id="clinic-services">Loading services...</div>
                        </div>
                        
                        <div class="mt-4">
                            <a href="appointments.html?clinic=${clinic.id}" class="btn btn-primary">Book Appointment</a>
                        </div>
                    </div>
                </div>
            `;
            
            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            // Load clinic services
            loadClinicServices(clinicId);
        })
        .catch(error => {
            console.error('Error loading clinic details:', error);
            container.innerHTML = `
                <div class="text-center">
                    <p class="text-danger">Failed to load clinic details. Please try again later.</p>
                    <button class="btn btn-outline-primary" onclick="loadClinicDetails('${clinicId}')">Try Again</button>
                </div>
            `;
        });
}

// Load clinic services
function loadClinicServices(clinicId) {
    const container = document.getElementById('clinic-services');
    if (!container) return;
    
    // Fetch clinic services
    fetch(`/api/clinics/${clinicId}/services`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(services => {
            if (services.length === 0) {
                container.innerHTML = `<p class="text-muted">No services listed for this clinic.</p>`;
                return;
            }
            
            // Create a table for services
            let serviceHTML = `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Duration</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add each service to the table
            services.forEach(service => {
                if (service.available === "true") {
                    serviceHTML += `
                        <tr>
                            <td>
                                <strong>${service.name}</strong>
                                ${service.description ? `<p class="mb-0 small text-muted">${service.description}</p>` : ''}
                            </td>
                            <td>${service.duration} mins</td>
                            <td>$${parseFloat(service.price).toFixed(2)}</td>
                        </tr>
                    `;
                }
            });
            
            serviceHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = serviceHTML;
        })
        .catch(error => {
            console.error('Error loading clinic services:', error);
            container.innerHTML = `
                <p class="text-danger">Failed to load services. Please try again later.</p>
            `;
        });
}