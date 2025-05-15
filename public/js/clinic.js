// Clinic-related functionality

// Load clinic profile
async function loadClinicProfile() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/clinics/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load clinic profile');
        }
        
        const clinic = await response.json();
        displayClinicProfile(clinic);
        
    } catch (error) {
        console.error('Error loading clinic profile:', error);
        showError('Failed to load clinic profile. Please try again later.');
    }
}

// Display clinic profile
function displayClinicProfile(clinic) {
    // Update clinic name
    const clinicNameElements = document.querySelectorAll('.clinic-name');
    clinicNameElements.forEach(el => {
        el.textContent = escapeHtml(clinic.name);
    });
    
    // Update clinic details
    const clinicAddressElement = document.getElementById('clinic-address');
    if (clinicAddressElement) {
        clinicAddressElement.textContent = escapeHtml(clinic.address || 'No address provided');
    }
    
    const clinicPhoneElement = document.getElementById('clinic-phone');
    if (clinicPhoneElement) {
        clinicPhoneElement.textContent = escapeHtml(clinic.phone || 'No phone provided');
    }
    
    const clinicEmailElement = document.getElementById('clinic-email');
    if (clinicEmailElement) {
        clinicEmailElement.textContent = escapeHtml(clinic.email);
    }
    
    const clinicSpecializationElement = document.getElementById('clinic-specialization');
    if (clinicSpecializationElement) {
        clinicSpecializationElement.textContent = escapeHtml(clinic.specialization || 'General Healthcare');
    }
    
    // Update form values for editing
    const nameInput = document.getElementById('clinic-name-input');
    if (nameInput) {
        nameInput.value = clinic.name;
    }
    
    const addressInput = document.getElementById('clinic-address-input');
    if (addressInput) {
        addressInput.value = clinic.address || '';
    }
    
    const phoneInput = document.getElementById('clinic-phone-input');
    if (phoneInput) {
        phoneInput.value = clinic.phone || '';
    }
    
    const specializationInput = document.getElementById('clinic-specialization-input');
    if (specializationInput) {
        specializationInput.value = clinic.specialization || '';
    }
}

// Update clinic profile
async function updateClinicProfile(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('clinic-name-input');
    const addressInput = document.getElementById('clinic-address-input');
    const phoneInput = document.getElementById('clinic-phone-input');
    const specializationInput = document.getElementById('clinic-specialization-input');
    
    const submitButton = document.querySelector('#update-profile-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            throw new Error('You must be logged in as a clinic to update your profile');
        }
        
        const updateData = {
            name: nameInput.value.trim(),
            address: addressInput.value.trim(),
            phone: phoneInput.value.trim(),
            specialization: specializationInput.value.trim()
        };
        
        const response = await authorizedFetch(`/api/clinics/${user.id}`, {
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
        
        const updatedClinic = await response.json();
        displayClinicProfile(updatedClinic);
        
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
        console.error('Error updating clinic profile:', error);
        showError(error.message || 'Failed to update profile');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Load clinic appointments
async function loadClinicAppointments() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/appointments/clinic/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load appointments');
        }
        
        const appointments = await response.json();
        displayClinicAppointments(appointments);
        
    } catch (error) {
        console.error('Error loading clinic appointments:', error);
        showError('Failed to load appointments. Please try again later.');
    }
}

// Display clinic appointments
function displayClinicAppointments(appointments) {
    const appointmentsContainer = document.getElementById('clinic-appointments');
    
    if (!appointmentsContainer) return;
    
    // Clear container
    appointmentsContainer.innerHTML = '';
    
    if (appointments.length === 0) {
        appointmentsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="calendar"></i>
                <h4>No appointments yet</h4>
                <p>Your scheduled appointments will appear here.</p>
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
                    <h5 class="card-title">${escapeHtml(appointment.patientName)}</h5>
                    <span class="badge ${getStatusBadgeClass(appointment.status)}">${appointment.status}</span>
                </div>
                <p class="card-text"><strong>Date:</strong> ${formatDate(appointment.date)}</p>
                <p class="card-text"><strong>Service:</strong> ${escapeHtml(appointment.service)}</p>
                <p class="card-text"><strong>Notes:</strong> ${escapeHtml(appointment.notes || 'No notes provided')}</p>
                <div class="d-flex justify-content-end mt-3">
                    ${getAppointmentActions(appointment)}
                </div>
            </div>
        `;
        appointmentsContainer.appendChild(appointmentCard);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.confirm-appointment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            updateAppointmentStatus(this.dataset.id, 'confirmed');
        });
    });
    
    document.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            updateAppointmentStatus(this.dataset.id, 'cancelled');
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Get appropriate badge class based on appointment status
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'bg-success';
        case 'pending':
            return 'bg-warning text-dark';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Get appointment action buttons based on status
function getAppointmentActions(appointment) {
    if (appointment.status.toLowerCase() === 'pending') {
        return `
            <button class="btn btn-sm btn-outline-success me-2 confirm-appointment-btn" data-id="${appointment.id}">
                Confirm
            </button>
            <button class="btn btn-sm btn-outline-danger cancel-appointment-btn" data-id="${appointment.id}">
                Cancel
            </button>
        `;
    } else if (appointment.status.toLowerCase() === 'confirmed') {
        return `
            <button class="btn btn-sm btn-outline-danger cancel-appointment-btn" data-id="${appointment.id}">
                Cancel
            </button>
        `;
    }
    return '';
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, status) {
    try {
        const response = await authorizedFetch(`/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update appointment status');
        }
        
        // Reload appointments
        loadClinicAppointments();
        showSuccess(`Appointment ${status} successfully`);
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showError(error.message || 'Failed to update appointment status');
    }
}

// Load clinic products
async function loadClinicProducts() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const response = await authorizedFetch(`/api/products/clinic/${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        
        const products = await response.json();
        displayClinicProducts(products);
        
    } catch (error) {
        console.error('Error loading clinic products:', error);
        showError('Failed to load products. Please try again later.');
    }
}

// Display clinic products
function displayClinicProducts(products) {
    const productsContainer = document.getElementById('clinic-products');
    
    if (!productsContainer) return;
    
    // Clear container
    productsContainer.innerHTML = '';
    
    if (products.length === 0) {
        productsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="package"></i>
                <h4>No products yet</h4>
                <p>Add products to your inventory to make them available for purchase.</p>
                <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProductModal">
                    Add Product
                </button>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Display products
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'col-md-4 mb-4';
        productCard.innerHTML = `
            <div class="card h-100 product-card">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(product.name)}</h5>
                    <span class="badge ${product.inStock ? 'bg-success' : 'bg-danger'}">
                        ${product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <p class="card-text mt-2">${escapeHtml(product.description || 'No description available')}</p>
                    <p class="product-price">${formatCurrency(product.price)}</p>
                    <p class="card-text"><small class="text-muted">Category: ${escapeHtml(product.category || 'Uncategorized')}</small></p>
                    <div class="d-flex justify-content-between mt-3">
                        <button class="btn btn-sm btn-outline-primary edit-product-btn" data-id="${product.id}" 
                                data-bs-toggle="modal" data-bs-target="#editProductModal">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-product-btn" data-id="${product.id}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadProductForEdit(this.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteProduct(this.dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Load product for editing
async function loadProductForEdit(productId) {
    try {
        const response = await authorizedFetch(`/api/products/${productId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load product details');
        }
        
        const product = await response.json();
        
        // Populate edit form
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-description').value = product.description || '';
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-category').value = product.category || '';
        document.getElementById('edit-product-in-stock').checked = product.inStock;
        
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showError('Failed to load product details. Please try again later.');
    }
}

// Add new product
async function addProduct(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('add-product-name');
    const descriptionInput = document.getElementById('add-product-description');
    const priceInput = document.getElementById('add-product-price');
    const categoryInput = document.getElementById('add-product-category');
    const inStockInput = document.getElementById('add-product-in-stock');
    
    const submitButton = document.querySelector('#add-product-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            throw new Error('You must be logged in as a clinic to add products');
        }
        
        const productData = {
            clinicId: user.id,
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            price: parseFloat(priceInput.value),
            category: categoryInput.value.trim(),
            inStock: inStockInput.checked
        };
        
        const response = await authorizedFetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add product');
        }
        
        // Reset form
        document.getElementById('add-product-form').reset();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload products
        loadClinicProducts();
        showSuccess('Product added successfully');
        
    } catch (error) {
        console.error('Error adding product:', error);
        showError(error.message || 'Failed to add product');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Update product
async function updateProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const nameInput = document.getElementById('edit-product-name');
    const descriptionInput = document.getElementById('edit-product-description');
    const priceInput = document.getElementById('edit-product-price');
    const categoryInput = document.getElementById('edit-product-category');
    const inStockInput = document.getElementById('edit-product-in-stock');
    
    const submitButton = document.querySelector('#edit-product-form button[type="submit"]');
    setLoading(submitButton.id, true);
    
    try {
        const productData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            price: parseFloat(priceInput.value),
            category: categoryInput.value.trim(),
            inStock: inStockInput.checked
        };
        
        const response = await authorizedFetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update product');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload products
        loadClinicProducts();
        showSuccess('Product updated successfully');
        
    } catch (error) {
        console.error('Error updating product:', error);
        showError(error.message || 'Failed to update product');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await authorizedFetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete product');
        }
        
        // Reload products
        loadClinicProducts();
        showSuccess('Product deleted successfully');
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showError(error.message || 'Failed to delete product');
    }
}

// Load clinic dashboard data
async function loadClinicDashboard() {
    try {
        const user = getUser();
        
        if (!user || user.type !== 'clinic') {
            window.location.href = '/pages/login.html';
            return;
        }
        
        // Load clinic profile
        const profileResponse = await authorizedFetch(`/api/clinics/${user.id}`);
        
        if (!profileResponse.ok) {
            throw new Error('Failed to load clinic profile');
        }
        
        const clinic = await profileResponse.json();
        displayClinicProfile(clinic);
        
        // Load clinic stats
        const statsResponse = await authorizedFetch(`/api/clinics/${user.id}/stats`);
        
        if (!statsResponse.ok) {
            throw new Error('Failed to load clinic statistics');
        }
        
        const stats = await statsResponse.json();
        displayClinicStats(stats);
        
        // Load recent appointments
        const appointmentsResponse = await authorizedFetch(`/api/appointments/clinic/${user.id}/recent`);
        
        if (!appointmentsResponse.ok) {
            throw new Error('Failed to load recent appointments');
        }
        
        const appointments = await appointmentsResponse.json();
        displayClinicAppointments(appointments);
        
    } catch (error) {
        console.error('Error loading clinic dashboard:', error);
        showError('Failed to load dashboard data. Please try again later.');
    }
}

// Display clinic statistics
function displayClinicStats(stats) {
    // Update appointment stats
    const totalAppointmentsElement = document.getElementById('total-appointments');
    if (totalAppointmentsElement) {
        totalAppointmentsElement.textContent = stats.appointments.total;
    }
    
    const pendingAppointmentsElement = document.getElementById('pending-appointments');
    if (pendingAppointmentsElement) {
        pendingAppointmentsElement.textContent = stats.appointments.pending;
    }
    
    const confirmedAppointmentsElement = document.getElementById('confirmed-appointments');
    if (confirmedAppointmentsElement) {
        confirmedAppointmentsElement.textContent = stats.appointments.confirmed;
    }
    
    // Update product stats
    const totalProductsElement = document.getElementById('total-products');
    if (totalProductsElement) {
        totalProductsElement.textContent = stats.products.total;
    }
    
    const inStockProductsElement = document.getElementById('in-stock-products');
    if (inStockProductsElement) {
        inStockProductsElement.textContent = stats.products.inStock;
    }
    
    // Update revenue stats
    const totalRevenueElement = document.getElementById('total-revenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = formatCurrency(stats.revenue.total);
    }
    
    const thisMonthRevenueElement = document.getElementById('this-month-revenue');
    if (thisMonthRevenueElement) {
        thisMonthRevenueElement.textContent = formatCurrency(stats.revenue.thisMonth);
    }
}
