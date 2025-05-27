// Patch or fix for patient-related UI or logic in the frontend
// Applies bug fixes or enhancements to patient dashboard or profile

// Patient-related functionality

// Load patient profile
async function loadPatientProfile() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/patients/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load patient profile');
        }
        
        const patient = await response.json();
        displayPatientProfile(patient);
        
    } catch (error) {
        console.error('Error loading patient profile:', error);
        showError('Failed to load patient profile. Please try again later.');
    }
}

// Display patient profile
function displayPatientProfile(patient) {
    // Update patient name
    const patientNameElements = document.querySelectorAll('.patient-name');
    patientNameElements.forEach(el => {
        el.textContent = escapeHtml(patient.name);
    });
    
    // Update patient details
    const patientAddressElement = document.getElementById('patient-address');
    if (patientAddressElement) {
        patientAddressElement.textContent = escapeHtml(patient.address || 'No address provided');
    }
    
    const patientPhoneElement = document.getElementById('patient-phone');
    if (patientPhoneElement) {
        patientPhoneElement.textContent = escapeHtml(patient.phone || 'No phone provided');
    }
    
    const patientEmailElement = document.getElementById('patient-email');
    if (patientEmailElement) {
        patientEmailElement.textContent = escapeHtml(patient.email);
    }
    
    // Update form values for editing
    const nameInput = document.getElementById('patient-name-input');
    if (nameInput) {
        nameInput.value = patient.name;
    }
    
    const addressInput = document.getElementById('patient-address-input');
    if (addressInput) {
        addressInput.value = patient.address || '';
    }
    
    const phoneInput = document.getElementById('patient-phone-input');
    if (phoneInput) {
        phoneInput.value = patient.phone || '';
    }
}

// Update patient profile
async function updatePatientProfile(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('patient-name-input');
    const addressInput = document.getElementById('patient-address-input');
    const phoneInput = document.getElementById('patient-phone-input');
    
    const submitButton = document.querySelector('#update-profile-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            throw new Error('You must be logged in as a patient to update your profile');
        }
        
        const updateData = {
            name: nameInput.value.trim(),
            address: addressInput.value.trim(),
            phone: phoneInput.value.trim()
        };
        
        const response = await authorizedFetch(`/api/patients/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }
        
        const updatedPatient = await response.json();
        displayPatientProfile(updatedPatient);
        
        // Update user data in local storage
        const updatedUser = { ...user, name: updateData.name };
        saveUserData(getToken(), updatedUser);
        
        showSuccess('Profile updated successfully');
        
        // Close modal if it exists
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        if (modal) {
            modal.hide();
        }
        
    } catch (error) {
        console.error('Error updating patient profile:', error);
        showError(error.message || 'Failed to update profile');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Load patient appointments
async function loadPatientAppointments() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/appointments/patient/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load appointments');
        }
        
        const appointments = await response.json();
        displayPatientAppointments(appointments);
        
    } catch (error) {
        console.error('Error loading patient appointments:', error);
        showError('Failed to load appointments. Please try again later.');
    }
}

// Display patient appointments
function displayPatientAppointments(appointments) {
    const appointmentsContainer = document.getElementById('patient-appointments');
    
    if (!appointmentsContainer) return;
    
    // Clear container
    appointmentsContainer.innerHTML = '';
    
    if (appointments.length === 0) {
        appointmentsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="calendar"></i>
                <h4>No appointments yet</h4>
                <p>Book your first appointment to get started.</p>
                <a href="/pages/appointments.html" class="btn btn-primary">Book Appointment</a>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Sort appointments by date (newest first)
    appointments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Display appointments
    appointments.forEach(appointment => {
        const appointmentCard = document.createElement('div');
        appointmentCard.className = `card appointment-card mb-3 ${appointment.status.toLowerCase()}`;
        appointmentCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="card-title">${escapeHtml(appointment.clinicName)}</h5>
                    <span class="badge ${getStatusBadgeClass(appointment.status)}">${appointment.status}</span>
                </div>
                <p class="card-text"><strong>Date:</strong> ${formatDate(appointment.date)}</p>
                <p class="card-text"><strong>Service:</strong> ${escapeHtml(appointment.service)}</p>
                <p class="card-text"><strong>Notes:</strong> ${escapeHtml(appointment.notes || 'No notes provided')}</p>
                <div class="d-flex justify-content-end mt-3">
                    ${appointment.status.toLowerCase() !== 'cancelled' ? 
                      `<button class="btn btn-sm btn-outline-danger cancel-appointment-btn" data-id="${appointment.id}">
                          Cancel
                       </button>` : ''}
                </div>
            </div>
        `;
        appointmentsContainer.appendChild(appointmentCard);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelAppointment(this.dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        const response = await authorizedFetch(`/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to cancel appointment');
        }
        
        // Reload appointments
        loadPatientAppointments();
        showSuccess('Appointment cancelled successfully');
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showError(error.message || 'Failed to cancel appointment');
    }
}

// Load patient orders - SIMPLIFIED AND FIXED VERSION
async function loadPatientOrders() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        console.log('Loading orders for patient:', user.id);
        const response = await authorizedFetch(`/api/orders/patient/${user.id}`);
        
        if (!response.ok) {
            console.error('Error loading orders: response status', response.status);
            displayPatientOrders([]);
            return;
        }
        
        const orders = await response.json();
        console.log('Orders received:', orders);
        
        // Start fresh by directly updating the DOM
        renderOrdersDirectlyToDom(orders);
        
    } catch (error) {
        console.error('Error loading patient orders:', error);
        // Display simplified empty orders on error
        renderEmptyOrdersState();
    }
}

// Render orders directly to the DOM for maximum reliability
function renderOrdersDirectlyToDom(orders) {
    const ordersContainer = document.getElementById('patient-orders');
    
    if (!ordersContainer) {
        console.error('Orders container not found!');
        return;
    }
    
    // Clear container
    ordersContainer.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        renderEmptyOrdersState();
        return;
    }
    
    // Build the HTML directly
    let html = `
        <div class="mb-4">
            <h4 class="mb-3">Your Orders (${orders.length})</h4>
    `;
    
    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    
    orders.forEach(order => {
        const orderDate = formatDate(order.date || order.created_at);
        const statusClass = getOrderStatusColorClass(order.status);
        
        // Calculate total if not available
        let totalAmount = parseFloat(order.total || "0");
        let itemsHtml = "";
        
        if (order.items && order.items.length > 0) {
            itemsHtml = "<table class='table table-sm'><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>";
            
            order.items.forEach(item => {
                const itemPrice = parseFloat(item.price || "0");
                const itemQty = parseInt(item.quantity || "1");
                itemsHtml += `
                    <tr>
                        <td>${escapeHtml(item.name || "Unknown Product")}</td>
                        <td>${itemQty}</td>
                        <td>$${itemPrice.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            itemsHtml += "</tbody></table>";
        } else {
            itemsHtml = "<p class='text-muted'>No items found in this order</p>";
        }
        
        html += `
            <div class="card mb-3 border-${statusClass}">
                <div class="card-header d-flex justify-content-between">
                    <div>
                        <strong>Order #${order.id.substring(0, 8)}</strong>
                        <small class="text-muted d-block">Placed on ${orderDate}</small>
                    </div>
                    <span class="badge bg-${statusClass}">${order.status}</span>
                </div>
                <div class="card-body">
                    <div class="progress mb-3" style="height: 5px;">
                        <div class="progress-bar bg-${statusClass}" style="width: ${getOrderProgressPercent(order.status)}%"></div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h6>Order Information</h6>
                            <p class="mb-1">Status: ${order.status}</p>
                            <p class="mb-1">Total: $${totalAmount.toFixed(2)}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Items</h6>
                            ${itemsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += "</div>";
    
    // Set the HTML directly 
    ordersContainer.innerHTML = html;
    
    // Initialize feather icons if available
    if (window.feather) {
        feather.replace();
    }
}

// Render empty orders state
function renderEmptyOrdersState() {
    const ordersContainer = document.getElementById('patient-orders');
    
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = `
        <div class="text-center py-5">
            <i data-feather="shopping-bag" style="width: 48px; height: 48px;"></i>
            <h4 class="mt-3">No orders yet</h4>
            <p>Browse our products and place your first order.</p>
            <a href="/pages/products.html" class="btn btn-primary">Shop Now</a>
        </div>
    `;
    
    if (window.feather) {
        feather.replace();
    }
}

// Helper function for order status color class
function getOrderStatusColorClass(status) {
    if (!status) return "secondary";
    
    switch (status.toLowerCase()) {
        case 'completed':
        case 'delivered':
            return "success";
        case 'processing':
            return "warning";
        case 'shipped':
            return "info";
        case 'cancelled':
            return "danger";
        default:
            return "secondary";
    }
}

// Helper function for order progress percentage
function getOrderProgressPercent(status) {
    if (!status) return 0;
    
    switch (status.toLowerCase()) {
        case 'processing':
            return 25;
        case 'shipped':
            return 75;
        case 'completed':
        case 'delivered':
            return 100;
        default:
            return 0;
    }
}

// Load patient prescriptions
async function loadPatientPrescriptions() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/prescriptions/patient/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load prescriptions');
        }
        
        const prescriptions = await response.json();
        displayPatientPrescriptions(prescriptions);
        
    } catch (error) {
        console.error('Error loading patient prescriptions:', error);
        showError('Failed to load prescriptions. Please try again later.');
    }
}

// Display patient prescriptions
function displayPatientPrescriptions(prescriptions) {
    const prescriptionsContainer = document.getElementById('patient-prescriptions');
    
    if (!prescriptionsContainer) return;
    
    // Clear container
    prescriptionsContainer.innerHTML = '';
    
    if (prescriptions.length === 0) {
        prescriptionsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="file-text"></i>
                <h4>No prescriptions yet</h4>
                <p>Your prescriptions will appear here after your doctor visits.</p>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Sort prescriptions by date (newest first)
    prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Display prescriptions
    prescriptions.forEach(prescription => {
        const prescriptionCard = document.createElement('div');
        prescriptionCard.className = 'card mb-4';
        
        let medicationsHtml = '';
        prescription.medications.forEach(medication => {
            medicationsHtml += `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(medication.name)}</strong>
                            <small class="d-block text-muted">${escapeHtml(medication.dosage)}</small>
                        </div>
                        <div class="text-end">
                            <small class="d-block">${escapeHtml(medication.frequency)}</small>
                            <small class="d-block text-muted">Duration: ${medication.duration}</small>
                        </div>
                    </div>
                </li>
            `;
        });
        
        prescriptionCard.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Prescription #${prescription.id.substring(0, 8)}</h5>
                    <span class="badge bg-primary">${formatDate(prescription.date)}</span>
                </div>
                <small class="text-muted">Doctor: ${escapeHtml(prescription.doctorName)}</small>
                <small class="text-muted d-block">Clinic: ${escapeHtml(prescription.clinicName)}</small>
            </div>
            <div class="card-body">
                <p class="card-text"><strong>Notes:</strong> ${escapeHtml(prescription.notes || 'No notes provided')}</p>
                <p class="card-text"><strong>Valid Until:</strong> ${prescription.validUntil ? formatDate(prescription.validUntil) : 'Not specified'}</p>
                
                <h6 class="mt-4">Medications</h6>
                <ul class="list-group">
                    ${medicationsHtml}
                </ul>
                
                <div class="d-grid gap-2 mt-4">
                    <button type="button" class="btn btn-primary order-prescription-btn" data-bs-toggle="modal" data-bs-target="#orderPrescriptionModal" data-id="${prescription.id}">
                        Order Medications
                    </button>
                </div>
            </div>
        `;
        prescriptionsContainer.appendChild(prescriptionCard);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.order-prescription-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setupPrescriptionOrder(this.dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Setup prescription order modal
function setupPrescriptionOrder(prescriptionId) {
    const prescriptionIdInput = document.getElementById('prescription-id-input');
    if (prescriptionIdInput) {
        prescriptionIdInput.value = prescriptionId;
    }
    
    // Load medications for this prescription
    loadPrescriptionMedications(prescriptionId);
}

// Load medications for a prescription
async function loadPrescriptionMedications(prescriptionId) {
    try {
        const response = await authorizedFetch(`/api/prescriptions/${prescriptionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load prescription details');
        }
        
        const prescription = await response.json();
        displayPrescriptionMedications(prescription);
        
    } catch (error) {
        console.error('Error loading prescription medications:', error);
        showError('Failed to load prescription details. Please try again later.');
    }
}

// Display prescription medications for ordering
function displayPrescriptionMedications(prescription) {
    const medicationsContainer = document.getElementById('prescription-medications');
    
    if (!medicationsContainer) return;
    
    // Clear container
    medicationsContainer.innerHTML = '';
    
    if (!prescription.medications || prescription.medications.length === 0) {
        medicationsContainer.innerHTML = `
            <p class="text-center py-3">No medications found in this prescription.</p>
        `;
        return;
    }
    
    prescription.medications.forEach(medication => {
        const medicationItem = document.createElement('div');
        medicationItem.className = 'form-check mb-3';
        medicationItem.innerHTML = `
            <input class="form-check-input medication-checkbox" type="checkbox" id="medication-${medication.id}" name="medications" value="${medication.id}" checked>
            <label class="form-check-label" for="medication-${medication.id}">
                <strong>${escapeHtml(medication.name)}</strong>
                <small class="d-block text-muted">${escapeHtml(medication.dosage)}, ${escapeHtml(medication.frequency)}</small>
            </label>
        `;
        medicationsContainer.appendChild(medicationItem);
    });
}

// Order prescription medications
async function orderPrescriptionMedications(event) {
    event.preventDefault();
    
    const prescriptionId = document.getElementById('prescription-id-input').value;
    const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked').value;
    const address = document.getElementById('delivery-address').value;
    
    const medicationCheckboxes = document.querySelectorAll('.medication-checkbox:checked');
    const medicationIds = Array.from(medicationCheckboxes).map(checkbox => checkbox.value);
    
    if (medicationIds.length === 0) {
        showError('Please select at least one medication to order.');
        return;
    }
    
    const submitButton = document.querySelector('#order-prescription-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            throw new Error('You must be logged in as a patient to order medications');
        }
        
        const orderData = {
            prescriptionId,
            medicationIds,
            deliveryMethod,
            address: deliveryMethod === 'delivery' ? address : null
        };
        
        const response = await authorizedFetch('/api/prescriptions/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to place order');
        }
        
        showSuccess('Order placed successfully!');
        
        // Close modal if it exists
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderPrescriptionModal'));
        if (modal) {
            modal.hide();
        }
        
        // Update orders section
        loadPatientOrders();
        
    } catch (error) {
        console.error('Error ordering medications:', error);
        showError(error.message || 'Failed to place order');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Load patient dashboard
async function loadPatientDashboard() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        // Load patient profile
        const profileResponse = await authorizedFetch(`/api/patients/${user.id}`);
        
        if (!profileResponse.ok) {
            throw new Error('Failed to load patient profile');
        }
        
        const patient = await profileResponse.json();
        displayPatientProfile(patient);
        
        // Load patient appointments
        const appointmentsResponse = await authorizedFetch(`/api/appointments/patient/${user.id}`);
        
        if (!appointmentsResponse.ok) {
            throw new Error('Failed to load appointments');
        }
        
        const appointments = await appointmentsResponse.json();
        displayPatientAppointments(appointments);
        
        // Load patient orders directly
        loadPatientOrders();
        
        // Load patient prescriptions
        const prescriptionsResponse = await authorizedFetch(`/api/prescriptions/patient/${user.id}`);
        
        if (!prescriptionsResponse.ok) {
            throw new Error('Failed to load prescriptions');
        }
        
        const prescriptions = await prescriptionsResponse.json();
        displayPatientPrescriptions(prescriptions);
        
        // Load patient rewards
        try {
            const rewardsResponse = await authorizedFetch(`/api/rewards/patient/${user.id}`);
            
            if (rewardsResponse.ok) {
                const rewards = await rewardsResponse.json();
                
                // Update rewards summary
                const totalPointsElement = document.getElementById('total-points');
                if (totalPointsElement) {
                    totalPointsElement.textContent = rewards.totalPoints || '0';
                }
                
                loadPatientRewards(rewards);
            }
        } catch (error) {
            console.error('Error loading rewards:', error);
        }
        
    } catch (error) {
        console.error('Error loading patient dashboard:', error);
        showError('Failed to load dashboard data. Please try again later.');
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

// Set loading state for a button
function setLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Submit';
    }
}

// Get appropriate badge class based on status
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'bg-success';
        case 'confirmed':
            return 'bg-primary';
        case 'pending':
            return 'bg-warning text-dark';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Format date string (ISO to local format)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format currency
function formatCurrency(amount) {
    if (!amount) return '$0.00';
    
    return '$' + parseFloat(amount).toFixed(2);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize feather icons
    if (window.feather) {
        feather.replace();
    }
    
    // Check if we're on the patient dashboard page
    if (document.getElementById('patient-dashboard-content')) {
        loadPatientDashboard();
    }
});