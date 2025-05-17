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

// Load patient orders
async function loadPatientOrders() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/products/orders/patient/${user.id}`);
        
        if (!response.ok) {
            // If 404, just show empty orders
            if (response.status === 404) {
                displayPatientOrders([]);
                return;
            }
            throw new Error('Failed to load orders');
        }
        
        const orders = await response.json();
        displayPatientOrders(orders);
        
    } catch (error) {
        console.error('Error loading patient orders:', error);
        showError('Failed to load orders. Please try again later.');
    }
}

// Display patient orders
function displayPatientOrders(orders) {
    const ordersContainer = document.getElementById('patient-orders');
    
    if (!ordersContainer) return;
    
    // Clear container
    ordersContainer.innerHTML = '';
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="shopping-bag"></i>
                <h4>No orders yet</h4>
                <p>Browse our products and place your first order.</p>
                <a href="/pages/products.html" class="btn btn-primary">Shop Now</a>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Display orders
    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'card mb-4';
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span>${escapeHtml(item.name)}</span>
                        <small class="text-muted d-block">Qty: ${item.quantity}</small>
                    </div>
                    <span>${formatCurrency(item.price * item.quantity)}</span>
                </div>
            `;
        });
        
        orderCard.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-0">Order #${order.id.substring(0, 8)}</h5>
                    <small class="text-muted">${formatDate(order.date)}</small>
                </div>
                <span class="badge ${getOrderStatusBadgeClass(order.status)}">${order.status}</span>
            </div>
            <div class="card-body">
                <p class="card-text mb-3"><strong>Clinic:</strong> ${escapeHtml(order.clinicName)}</p>
                <h6 class="border-bottom pb-2 mb-3">Order Items</h6>
                ${itemsHtml}
                <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <span><strong>Total:</strong></span>
                    <span class="fs-5 fw-bold">${formatCurrency(order.total)}</span>
                </div>
                <div class="mt-3">
                    <p class="mb-1"><small class="text-muted">You earned ${order.pointsEarned} reward points from this purchase.</small></p>
                </div>
            </div>
        `;
        ordersContainer.appendChild(orderCard);
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Get appropriate badge class based on order status
function getOrderStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'bg-success';
        case 'processing':
            return 'bg-warning text-dark';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
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
                <h6 class="mb-3">Diagnosis</h6>
                <p>${escapeHtml(prescription.diagnosis)}</p>
                
                <h6 class="mt-4 mb-3">Medications</h6>
                <ul class="list-group mb-3">
                    ${medicationsHtml}
                </ul>
                
                <h6 class="mt-4 mb-3">Notes</h6>
                <p>${escapeHtml(prescription.notes || 'No additional notes')}</p>
                
                <div class="d-flex justify-content-end mt-3">
                    <button class="btn btn-outline-primary btn-sm order-prescription-btn" 
                            data-id="${prescription.id}" 
                            data-bs-toggle="modal" 
                            data-bs-target="#orderPrescriptionModal">
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
            loadPrescriptionForOrder(this.dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Load prescription for ordering
async function loadPrescriptionForOrder(prescriptionId) {
    try {
        const response = await authorizedFetch(`/api/prescriptions/${prescriptionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load prescription details');
        }
        
        const prescription = await response.json();
        
        // Populate order modal
        const medicationsContainer = document.getElementById('prescription-medications');
        if (medicationsContainer) {
            medicationsContainer.innerHTML = '';
            
            prescription.medications.forEach(medication => {
                const medicationItem = document.createElement('div');
                medicationItem.className = 'form-check mb-3';
                medicationItem.innerHTML = `
                    <input class="form-check-input" type="checkbox" id="med-${medication.id}" name="medications[]" value="${medication.id}" checked>
                    <label class="form-check-label d-block" for="med-${medication.id}">
                        <strong>${escapeHtml(medication.name)}</strong>
                        <small class="d-block text-muted">${escapeHtml(medication.dosage)} - ${escapeHtml(medication.frequency)}</small>
                    </label>
                `;
                medicationsContainer.appendChild(medicationItem);
            });
        }
        
        // Set prescription ID
        const prescriptionIdInput = document.getElementById('prescription-id');
        if (prescriptionIdInput) {
            prescriptionIdInput.value = prescriptionId;
        }
        
        // Set clinic name
        const clinicNameElement = document.getElementById('prescription-clinic-name');
        if (clinicNameElement) {
            clinicNameElement.textContent = prescription.clinicName;
        }
        
    } catch (error) {
        console.error('Error loading prescription for order:', error);
        showError('Failed to load prescription details. Please try again later.');
    }
}

// Order prescription medications
async function orderPrescriptionMedications(event) {
    event.preventDefault();
    
    const prescriptionId = document.getElementById('prescription-id').value;
    const checkboxes = document.querySelectorAll('#prescription-medications input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        showError('Please select at least one medication to order');
        return;
    }
    
    const submitButton = document.querySelector('#order-prescription-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            throw new Error('You must be logged in as a patient to order medications');
        }
        
        const selectedMedications = Array.from(checkboxes).map(checkbox => checkbox.value);
        
        const orderData = {
            prescriptionId,
            patientId: user.id,
            medicationIds: selectedMedications
        };
        
        const response = await authorizedFetch('/api/orders/prescription', {
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
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderPrescriptionModal'));
        if (modal) {
            modal.hide();
        }
        
        showSuccess('Your order has been placed successfully');
        
        // Redirect to orders page
        setTimeout(() => {
            window.location.href = '/pages/patient-dashboard.html#orders';
        }, 2000);
        
    } catch (error) {
        console.error('Error ordering prescription medications:', error);
        showError(error.message || 'Failed to place order');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Load patient rewards
async function loadPatientRewards() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/rewards/patient/${user.id}`);
        
        if (!response.ok) {
            // If 404, just show empty rewards
            if (response.status === 404) {
                // Create a default empty rewards object
                displayPatientRewards({
                    totalPoints: "0",
                    history: [],
                    card: null
                });
                return;
            }
            throw new Error('Failed to load rewards');
        }
        
        const rewards = await response.json();
        displayPatientRewards(rewards);
        
    } catch (error) {
        console.error('Error loading patient rewards:', error);
        showError('Failed to load rewards. Please try again later.');
    }
}

// Display patient rewards
function displayPatientRewards(rewards) {
    // Update total points
    const totalPointsElement = document.getElementById('total-points');
    if (totalPointsElement) {
        totalPointsElement.textContent = rewards.totalPoints;
    }
    
    // Update points history
    const pointsHistoryContainer = document.getElementById('points-history');
    if (!pointsHistoryContainer) return;
    
    // Clear container
    pointsHistoryContainer.innerHTML = '';
    
    if (rewards.history.length === 0) {
        pointsHistoryContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="award"></i>
                <h4>No rewards history yet</h4>
                <p>Make purchases to earn rewards points.</p>
                <a href="/pages/products.html" class="btn btn-primary">Shop Now</a>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Sort history by date (newest first)
    rewards.history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create table
    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Points</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    // Display rewards history
    rewards.history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${escapeHtml(item.description)}</td>
            <td class="${item.points >= 0 ? 'text-success' : 'text-danger'}">
                ${item.points >= 0 ? '+' : ''}${item.points}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    pointsHistoryContainer.appendChild(table);
    
    // Initialize Feather icons
    if (window.feather) {
        feather.replace();
    }
}

// Load patient dashboard data
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
        
        // Load patient orders
        try {
            const ordersResponse = await authorizedFetch(`/api/products/orders/patient/${user.id}`);
            
            if (ordersResponse.ok) {
                const orders = await ordersResponse.json();
                displayPatientOrders(orders);
            } else {
                // If there's an error (like 404), display empty orders
                displayPatientOrders([]);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            // Display empty orders on error
            displayPatientOrders([]);
        }
        
        // Load patient rewards
        const rewardsResponse = await authorizedFetch(`/api/rewards/patient/${user.id}`);
        
        if (!rewardsResponse.ok) {
            throw new Error('Failed to load rewards');
        }
        
        const rewards = await rewardsResponse.json();
        
        // Update rewards summary
        const totalPointsElement = document.getElementById('dashboard-total-points');
        if (totalPointsElement) {
            totalPointsElement.textContent = rewards.totalPoints;
        }
        
    } catch (error) {
        console.error('Error loading patient dashboard:', error);
        showError('Failed to load dashboard data. Please try again later.');
    }
}
