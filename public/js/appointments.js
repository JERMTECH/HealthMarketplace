// Handles appointment booking and management for the frontend
// Loads available appointments, allows users to book, cancel, or view appointment details

// Appointments related functionality

// Load available clinics for appointment booking
async function loadClinicsForAppointment() {
    try {
        const response = await fetch('/api/clinics');
        
        if (!response.ok) {
            throw new Error('Failed to fetch clinics');
        }
        
        const clinics = await response.json();
        displayClinicsForAppointment(clinics);
        
    } catch (error) {
        console.error('Error loading clinics:', error);
        const clinicsContainer = document.getElementById('clinics-list');
        if (clinicsContainer) {
            clinicsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load clinics. Please try again later.
                </div>
            `;
        }
    }
}

// Display clinics for appointment booking
function displayClinicsForAppointment(clinics) {
    const clinicsContainer = document.getElementById('clinics-list');
    if (!clinicsContainer) return;
    
    // Clear container
    clinicsContainer.innerHTML = '';
    
    if (clinics.length === 0) {
        clinicsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="package"></i>
                <h4>No clinics available</h4>
                <p>There are no clinics registered on our platform yet.</p>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Check for specific clinic ID from URL
    const clinicId = getUrlParam('clinicId');
    
    // Display clinics
    clinics.forEach(clinic => {
        const clinicCard = document.createElement('div');
        clinicCard.className = 'col-md-6 mb-4';
        
        // If clinicId is specified, only show that clinic
        if (clinicId && clinic.id !== clinicId) {
            return;
        }
        
        clinicCard.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(clinic.name)}</h5>
                    <p class="card-text">${escapeHtml(clinic.specialization || 'General Healthcare')}</p>
                    <p class="card-text"><small class="text-muted"><i data-feather="map-pin" class="feather-sm"></i> ${escapeHtml(clinic.location || clinic.address || 'No address provided')}</small></p>
                    <button class="btn btn-primary select-clinic-btn" data-id="${clinic.id}" data-name="${escapeHtml(clinic.name)}">
                        Book Appointment
                    </button>
                </div>
            </div>
        `;
        clinicsContainer.appendChild(clinicCard);
    });
    
    // Add event listeners for select buttons
    document.querySelectorAll('.select-clinic-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectClinicForAppointment(this.dataset.id, this.dataset.name);
        });
    });
    
    // If only one clinic is displayed (from URL parameter), select it automatically
    if (clinicId && document.querySelectorAll('.select-clinic-btn').length === 1) {
        document.querySelector('.select-clinic-btn').click();
    }
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Select a clinic for appointment booking
function selectClinicForAppointment(clinicId, clinicName) {
    const clinicSelectionSection = document.getElementById('clinic-selection-section');
    const appointmentFormSection = document.getElementById('appointment-form-section');
    const selectedClinicName = document.getElementById('selected-clinic-name');
    const clinicIdInput = document.getElementById('clinic-id');
    
    if (clinicSelectionSection && appointmentFormSection) {
        // Update selected clinic info
        selectedClinicName.textContent = clinicName;
        clinicIdInput.value = clinicId;
        
        // Show appointment form
        clinicSelectionSection.style.display = 'none';
        appointmentFormSection.style.display = 'block';
        
        // Load available services for the selected clinic
        loadClinicServices(clinicId);
    }
}

// Load available services for the selected clinic
async function loadClinicServices(clinicId) {
    try {
        const response = await fetch(`/api/clinics/${clinicId}/services`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }
        
        const services = await response.json();
        displayClinicServices(services);
        
    } catch (error) {
        console.error('Error loading clinic services:', error);
        const servicesSelect = document.getElementById('service');
        if (servicesSelect) {
            servicesSelect.innerHTML = `
                <option value="">Failed to load services</option>
            `;
        }
    }
}

// Display clinic services in the form
function displayClinicServices(services) {
    const servicesSelect = document.getElementById('service');
    if (!servicesSelect) return;
    
    // Clear select options
    servicesSelect.innerHTML = '<option value="">Select a service</option>';
    
    // Add service options
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.name;
        option.textContent = `${service.name} (${formatCurrency(service.price)})`;
        option.dataset.price = service.price;
        servicesSelect.appendChild(option);
    });
    
    // Enable the select element
    servicesSelect.disabled = false;
}

// Book an appointment
async function bookAppointment(event) {
    event.preventDefault();
    
    // Check if user is logged in
    const user = getUser();
    if (!user || user.type !== 'patient') {
        alert('Please log in as a patient to book an appointment');
        window.location.href = '/pages/login.html?redirect=appointments.html';
        return;
    }
    
    const clinicId = document.getElementById('clinic-id').value;
    const serviceSelect = document.getElementById('service');
    const service = serviceSelect.value;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const notes = document.getElementById('notes').value;
    
    // Validate inputs
    if (!service) {
        showError('Please select a service', 'appointment-error');
        return;
    }
    
    if (!date) {
        showError('Please select a date', 'appointment-error');
        return;
    }
    
    if (!time) {
        showError('Please select a time', 'appointment-error');
        return;
    }
    
    const submitButton = document.getElementById('book-appointment-btn');
    setLoading(submitButton.id, true);
    
    try {
        // Create appointment data
        const appointmentData = {
            clinicId,
            patientId: user.id,
            service,
            date: `${date}T${time}:00`,
            notes,
            status: 'Pending'
        };
        
        const response = await authorizedFetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to book appointment');
        }
        
        // Show success message
        document.getElementById('appointment-form-section').style.display = 'none';
        document.getElementById('appointment-success-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error booking appointment:', error);
        showError(error.message || 'Failed to book appointment', 'appointment-error');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Initialize appointment booking form
function initAppointmentForm() {
    // Set minimum date to today
    const dateInput = document.getElementById('appointment-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1;
        let dd = today.getDate();
        
        if (mm < 10) mm = '0' + mm;
        if (dd < 10) dd = '0' + dd;
        
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }
    
    // Return to clinic selection
    const backToClinicBtn = document.getElementById('back-to-clinic-btn');
    if (backToClinicBtn) {
        backToClinicBtn.addEventListener('click', function() {
            document.getElementById('clinic-selection-section').style.display = 'block';
            document.getElementById('appointment-form-section').style.display = 'none';
        });
    }
    
    // Book a new appointment
    const bookNewBtn = document.getElementById('book-new-btn');
    if (bookNewBtn) {
        bookNewBtn.addEventListener('click', function() {
            document.getElementById('clinic-selection-section').style.display = 'block';
            document.getElementById('appointment-success-section').style.display = 'none';
            document.getElementById('appointment-form').reset();
        });
    }
    
    // View appointments button
    const viewAppointmentsBtn = document.getElementById('view-appointments-btn');
    if (viewAppointmentsBtn) {
        viewAppointmentsBtn.addEventListener('click', function() {
            window.location.href = '/pages/patient-dashboard.html#appointments';
        });
    }
}

// When the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the appointments page
    if (window.location.pathname.includes('/appointments.html')) {
        loadClinicsForAppointment();
        initAppointmentForm();
        
        // Add event listener for form submission
        const appointmentForm = document.getElementById('appointment-form');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', bookAppointment);
        }
    }
});
