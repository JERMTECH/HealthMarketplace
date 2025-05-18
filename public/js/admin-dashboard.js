// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    validateAdminAccess();
    
    // Set up menu navigation
    setupMenuNavigation();
    
    // Load dashboard data
    loadDashboardStatistics();
    
    // Add click handlers for specific buttons
    if (document.getElementById('save-product-btn')) {
        document.getElementById('save-product-btn').addEventListener('click', saveProductChanges);
    }
    
    if (document.getElementById('save-customer-btn')) {
        document.getElementById('save-customer-btn').addEventListener('click', saveCustomerChanges);
    }
    
    if (document.getElementById('save-clinic-btn')) {
        document.getElementById('save-clinic-btn').addEventListener('click', saveClinicChanges);
    }
    
    // Setup logout functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
        window.location.href = '/pages/login.html';
    });
});

// Simple functions to handle actions - direct and global
function viewProductDetails(id) {
    try {
        const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
        if (productRow) {
            const name = productRow.querySelector('td:nth-child(2)').textContent;
            const type = productRow.querySelector('td:nth-child(3)').textContent;
            const clinic = productRow.querySelector('td:nth-child(4)').textContent;
            const price = productRow.querySelector('td:nth-child(5)').textContent;
            
            // Update modal content
            document.getElementById('product-detail-name').textContent = name;
            document.getElementById('product-detail-type').textContent = type;
            document.getElementById('product-detail-clinic').textContent = clinic;
            document.getElementById('product-detail-price').textContent = price;
            document.getElementById('product-detail-id').textContent = id;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('productDetailsModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Product not found');
        }
    } catch (error) {
        console.error('Error showing product details:', error);
        alert('Error: ' + error.message);
    }
}

function editProduct(id) {
    try {
        const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
        if (productRow) {
            const name = productRow.querySelector('td:nth-child(2)').textContent;
            const type = productRow.querySelector('td:nth-child(3)').textContent;
            const price = productRow.querySelector('td:nth-child(5)').textContent.replace('$', '');
            
            // Pre-fill form
            document.getElementById('edit-product-id').value = id;
            document.getElementById('edit-product-name').value = name;
            document.getElementById('edit-product-type').value = type;
            document.getElementById('edit-product-price').value = price;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('productEditModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Product not found for editing');
        }
    } catch (error) {
        console.error('Error editing product:', error);
        alert('Error: ' + error.message);
    }
}

function toggleProductStatus(id) {
    try {
        // Toggle product availability
        const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
        if (productRow) {
            const statusCell = productRow.querySelector('td:nth-child(6)');
            const currentStatus = statusCell.querySelector('.badge').textContent;
            
            // Toggle status
            if (currentStatus.includes('In Stock')) {
                statusCell.innerHTML = '<span class="badge bg-danger">Out of Stock</span>';
                alert('Product marked as Out of Stock');
            } else {
                statusCell.innerHTML = '<span class="badge bg-success">In Stock</span>';
                alert('Product marked as In Stock');
            }
        } else {
            alert('Product not found');
        }
    } catch (error) {
        console.error('Error toggling product status:', error);
        alert('Error: ' + error.message);
    }
}

// Make sure old functions are also available
function viewProductDetails(id) {
    window.AdminActions.viewProductDetails(id);
}

function editProduct(id) {
    window.AdminActions.editProduct(id);
}

function toggleProductStatus(id) {
    window.AdminActions.toggleProductStatus(id);
}

// Functions to save changes for each form type
function saveProductChanges() {
    try {
        const form = document.getElementById('edit-product-form');
        const id = document.getElementById('edit-product-id').value;
        if (form.checkValidity()) {
            const name = document.getElementById('edit-product-name').value;
            const type = document.getElementById('edit-product-type').value;
            const price = document.getElementById('edit-product-price').value;
            
            // Update the corresponding row in the table
            const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
            if (productRow) {
                productRow.querySelector('td:nth-child(2)').textContent = name;
                productRow.querySelector('td:nth-child(3)').textContent = type;
                productRow.querySelector('td:nth-child(5)').textContent = '$' + parseFloat(price).toFixed(2);
                
                alert('Product updated successfully');
                const modalElement = document.getElementById('productEditModal');
                bootstrap.Modal.getInstance(modalElement).hide();
            }
        } else {
            form.reportValidity();
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error: ' + error.message);
    }
}

// Extend AdminActions with customer and clinic methods
window.AdminActions.viewCustomerProfile = function(id) {
    try {
        const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
        if (customerRow) {
            const name = customerRow.querySelector('td:nth-child(2)').textContent;
            const email = customerRow.querySelector('td:nth-child(3)').textContent;
            const phone = customerRow.querySelector('td:nth-child(4)').textContent;
            
            // Update modal
            document.getElementById('customer-detail-name').textContent = name;
            document.getElementById('customer-detail-email').textContent = email;
            document.getElementById('customer-detail-phone').textContent = phone;
            document.getElementById('customer-detail-id').textContent = id;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('customerDetailsModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Customer not found');
        }
    } catch (error) {
        console.error('Error showing customer details:', error);
        alert('Error: ' + error.message);
    }
};

window.AdminActions.editCustomer = function(id) {
    try {
        const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
        if (customerRow) {
            const name = customerRow.querySelector('td:nth-child(2)').textContent;
            const email = customerRow.querySelector('td:nth-child(3)').textContent;
            const phone = customerRow.querySelector('td:nth-child(4)').textContent;
            
            // Pre-fill form
            document.getElementById('edit-customer-id').value = id;
            document.getElementById('edit-customer-name').value = name;
            document.getElementById('edit-customer-email').value = email;
            document.getElementById('edit-customer-phone').value = phone;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('customerEditModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Customer not found for editing');
        }
    } catch (error) {
        console.error('Error editing customer:', error);
        alert('Error: ' + error.message);
    }
};

function saveCustomerChanges() {
    try {
        const form = document.getElementById('edit-customer-form');
        const id = document.getElementById('edit-customer-id').value;
        if (form.checkValidity()) {
            const name = document.getElementById('edit-customer-name').value;
            const email = document.getElementById('edit-customer-email').value;
            const phone = document.getElementById('edit-customer-phone').value;
            
            // Update the corresponding row in the table
            const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
            if (customerRow) {
                customerRow.querySelector('td:nth-child(2)').textContent = name;
                customerRow.querySelector('td:nth-child(3)').textContent = email;
                customerRow.querySelector('td:nth-child(4)').textContent = phone;
                
                alert('Customer updated successfully');
                const modalElement = document.getElementById('customerEditModal');
                bootstrap.Modal.getInstance(modalElement).hide();
            }
        } else {
            form.reportValidity();
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error: ' + error.message);
    }
}

window.AdminActions.viewClinicProfile = function(id) {
    try {
        const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
        if (clinicRow) {
            const name = clinicRow.querySelector('td:nth-child(2)').textContent;
            const specialization = clinicRow.querySelector('td:nth-child(3)').textContent;
            const location = clinicRow.querySelector('td:nth-child(4)').textContent;
            const phone = clinicRow.querySelector('td:nth-child(5)').textContent;
            
            // Update modal
            document.getElementById('clinic-detail-name').textContent = name;
            document.getElementById('clinic-detail-specialization').textContent = specialization;
            document.getElementById('clinic-detail-location').textContent = location;
            document.getElementById('clinic-detail-phone').textContent = phone;
            document.getElementById('clinic-detail-id').textContent = id;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('clinicDetailsModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Healthcare facility not found');
        }
    } catch (error) {
        console.error('Error showing healthcare facility details:', error);
        alert('Error: ' + error.message);
    }
};

window.AdminActions.editClinic = function(id) {
    try {
        const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
        if (clinicRow) {
            const name = clinicRow.querySelector('td:nth-child(2)').textContent;
            const specialization = clinicRow.querySelector('td:nth-child(3)').textContent;
            const location = clinicRow.querySelector('td:nth-child(4)').textContent;
            const phone = clinicRow.querySelector('td:nth-child(5)').textContent;
            
            // Pre-fill form
            document.getElementById('edit-clinic-id').value = id;
            document.getElementById('edit-clinic-name').value = name;
            document.getElementById('edit-clinic-specialization').value = specialization;
            document.getElementById('edit-clinic-location').value = location;
            document.getElementById('edit-clinic-phone').value = phone;
            
            // Show modal using Bootstrap
            const modalElement = document.getElementById('clinicEditModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            alert('Healthcare facility not found for editing');
        }
    } catch (error) {
        console.error('Error editing healthcare facility:', error);
        alert('Error: ' + error.message);
    }
};

// Add helper functions for the old function names
function viewCustomerProfile(id) {
    window.AdminActions.viewCustomerProfile(id);
}

function editCustomer(id) {
    window.AdminActions.editCustomer(id);
}

function viewClinicProfile(id) {
    window.AdminActions.viewClinicProfile(id);
}

function editClinic(id) {
    window.AdminActions.editClinic(id);
}

function saveClinicChanges() {
    try {
        const form = document.getElementById('edit-clinic-form');
        const id = document.getElementById('edit-clinic-id').value;
        if (form.checkValidity()) {
            const name = document.getElementById('edit-clinic-name').value;
            const specialization = document.getElementById('edit-clinic-specialization').value;
            const location = document.getElementById('edit-clinic-location').value;
            const phone = document.getElementById('edit-clinic-phone').value;
            
            // Update the corresponding row in the table
            const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
            if (clinicRow) {
                clinicRow.querySelector('td:nth-child(2)').textContent = name;
                clinicRow.querySelector('td:nth-child(3)').textContent = specialization;
                clinicRow.querySelector('td:nth-child(4)').textContent = location;
                clinicRow.querySelector('td:nth-child(5)').textContent = phone;
                
                alert('Healthcare Facility updated successfully');
                const modalElement = document.getElementById('clinicEditModal');
                bootstrap.Modal.getInstance(modalElement).hide();
            }
        } else {
            form.reportValidity();
        }
    } catch (error) {
        console.error('Error saving healthcare facility:', error);
        alert('Error: ' + error.message);
    }
}

// Initialize toast container for notifications
function createToastContainer() {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
}

// Validate that the current user has admin access
function validateAdminAccess() {
    const user = getUser();
    
    if (!user) {
        // Not logged in, redirect to admin login
        window.location.href = '/pages/admin-login.html';
        return;
    }
    
    if (!isAdmin()) {
        // Not an admin, redirect to main login
        alert('You do not have permission to access the admin dashboard.');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Set admin name in the UI
    if (user.name) {
        document.getElementById('admin-name').textContent = user.name;
    }
    
    console.log('Admin access granted for:', user.name);
}

// Setup the side menu navigation
function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            menuItems.forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the section to show
            const sectionId = this.getAttribute('data-section');
            
            // Hide all sections
            document.querySelectorAll('.admin-section').forEach(section => {
                section.classList.add('d-none');
            });
            
            // Show the selected section
            document.getElementById(`${sectionId}-section`).classList.remove('d-none');
            
            // Load data for the section if needed
            loadSectionData(sectionId);
            
            // Update URL hash
            window.location.hash = sectionId;
        });
    });
    
    // Check URL hash on page load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const menuItem = document.querySelector(`.admin-menu-item[data-section="${hash}"]`);
        
        if (menuItem) {
            menuItem.click();
        }
    }
}

// Load data for dashboard statistics
async function loadDashboardStatistics() {
    try {
        // Fetch counts from API
        const productsCount = await fetchProductsCount();
        const customersCount = await fetchCustomersCount();
        const clinicsCount = await fetchClinicsCount();
        const ordersCount = await fetchOrdersCount();
        
        // Update the dashboard statistics
        document.getElementById('products-count').textContent = productsCount;
        document.getElementById('customers-count').textContent = customersCount;
        document.getElementById('clinics-count').textContent = clinicsCount;
        document.getElementById('orders-count').textContent = ordersCount;
        
        // Load recent orders for dashboard
        loadRecentOrders();
        
        // Initialize charts
        initializeRevenueChart();
        initializeRevenueBreakdownChart();
        
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
    }
}

// Load section-specific data
async function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'products':
            loadProducts();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'clinics':
            loadClinics();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'rewards':
            loadRewardData();
            break;
        case 'reports':
            initializeAnalyticsCharts();
            break;
    }
}

// Fetch total number of products
async function fetchProductsCount() {
    try {
        const response = await authorizedFetch('/api/products/count');
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error fetching products count:', error);
        return 0;
    }
}

// Fetch total number of customers
async function fetchCustomersCount() {
    try {
        const response = await authorizedFetch('/api/patients/count');
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error fetching customers count:', error);
        return 0;
    }
}

// Fetch total number of clinics
async function fetchClinicsCount() {
    try {
        const response = await authorizedFetch('/api/clinics/count');
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error fetching clinics count:', error);
        return 0;
    }
}

// Fetch total number of orders
async function fetchOrdersCount() {
    try {
        const response = await authorizedFetch('/api/products/orders/count');
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error fetching orders count:', error);
        return 0;
    }
}

// Load recent orders for the dashboard
async function loadRecentOrders() {
    try {
        const response = await authorizedFetch('/api/products/orders/recent');
        const orders = await response.json();
        
        const ordersTable = document.getElementById('recent-orders');
        
        if (orders.length === 0) {
            ordersTable.innerHTML = '<tr><td colspan="6" class="text-center">No recent orders found</td></tr>';
            return;
        }
        
        let html = '';
        
        orders.forEach(order => {
            const statusClass = getStatusClass(order.status);
            
            html += `
                <tr>
                    <td>${order.id.substring(0, 8)}...</td>
                    <td>${order.patient.name}</td>
                    <td>${formatDate(order.created_at)}</td>
                    <td>$${parseFloat(order.total).toFixed(2)}</td>
                    <td><span class="badge ${statusClass}">${order.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrderDetails('${order.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateOrderStatus('${order.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        ordersTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
        document.getElementById('recent-orders').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">Failed to load recent orders</td></tr>';
    }
}

// Initialize revenue chart
function initializeRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    
    // Sample data - replace with actual API data
    const monthlyData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Revenue',
            backgroundColor: 'rgba(13, 110, 253, 0.2)',
            borderColor: 'rgba(13, 110, 253, 1)',
            borderWidth: 2,
            data: [12500, 15000, 14000, 18000, 19500, 21000, 22000, 24000, 23000, 26000, 25000, 28000],
            tension: 0.3
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: monthlyData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Initialize revenue breakdown chart
function initializeRevenueBreakdownChart() {
    const ctx = document.getElementById('revenue-breakdown');
    
    // Sample data - replace with actual API data
    const breakdownData = {
        labels: ['Products', 'Services', 'Prescriptions'],
        datasets: [{
            data: [45, 35, 20],
            backgroundColor: [
                'rgba(13, 110, 253, 0.7)',
                'rgba(25, 135, 84, 0.7)',
                'rgba(220, 53, 69, 0.7)'
            ],
            borderColor: [
                'rgba(13, 110, 253, 1)',
                'rgba(25, 135, 84, 1)',
                'rgba(220, 53, 69, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: breakdownData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '65%'
        }
    });
}

// Initialize analytics charts for the reports section
function initializeAnalyticsCharts() {
    // Sales by category chart
    const categorySalesCtx = document.getElementById('category-sales-chart');
    const categoryData = {
        labels: ['Medications', 'Supplements', 'Equipment', 'Wellness', 'Other'],
        datasets: [{
            label: 'Sales Amount',
            data: [32000, 18000, 15000, 12000, 8000],
            backgroundColor: [
                'rgba(13, 110, 253, 0.7)',
                'rgba(25, 135, 84, 0.7)',
                'rgba(255, 193, 7, 0.7)',
                'rgba(13, 202, 240, 0.7)',
                'rgba(173, 181, 189, 0.7)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(categorySalesCtx, {
        type: 'bar',
        data: categoryData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    // Appointment distribution chart
    const appointmentCtx = document.getElementById('appointment-distribution-chart');
    const appointmentData = {
        labels: ['Consultation', 'Check-up', 'Treatment', 'Surgery', 'Emergency'],
        datasets: [{
            data: [40, 25, 20, 10, 5],
            backgroundColor: [
                'rgba(13, 110, 253, 0.7)',
                'rgba(25, 135, 84, 0.7)',
                'rgba(255, 193, 7, 0.7)',
                'rgba(220, 53, 69, 0.7)',
                'rgba(13, 202, 240, 0.7)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(appointmentCtx, {
        type: 'pie',
        data: appointmentData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load products data
async function loadProducts() {
    try {
        const response = await authorizedFetch('/api/products/all');
        const products = await response.json();
        
        const productsTable = document.getElementById('products-table');
        
        if (products.length === 0) {
            productsTable.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
            return;
        }
        
        let html = '';
        
        products.forEach(product => {
            const status = product.in_stock ? 
                '<span class="badge bg-success">In Stock</span>' : 
                '<span class="badge bg-danger">Out of Stock</span>';
            
            // Use simple function calls for buttons
            html += `
                <tr data-id="${product.id}">
                    <td>${product.id.substring(0, 8)}...</td>
                    <td>${product.name}</td>
                    <td>Product</td>
                    <td>${product.clinic ? product.clinic.name : 'N/A'}</td>
                    <td>$${parseFloat(product.price).toFixed(2)}</td>
                    <td>${status}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" 
                            onclick="alert('View product: ' + '${product.name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary me-1"
                            onclick="alert('Edit product: ' + '${product.name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger"
                            onclick="alert('Toggle status for: ' + '${product.name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-power"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        productsTable.innerHTML = html;
        
        // Load clinic dropdowns for filters
        loadClinicDropdowns();
        
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-table').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load products</td></tr>';
    }
}

// Load clinic dropdowns for filters
async function loadClinicDropdowns() {
    try {
        const response = await authorizedFetch('/api/clinics/all');
        const clinics = await response.json();
        
        const clinicDropdowns = document.querySelectorAll('#product-filter-clinic, #appointment-filter-clinic');
        
        clinicDropdowns.forEach(dropdown => {
            // Keep the "All Clinics" option
            let options = '<option value="all">All Clinics</option>';
            
            clinics.forEach(clinic => {
                options += `<option value="${clinic.id}">${clinic.name}</option>`;
            });
            
            dropdown.innerHTML = options;
        });
        
    } catch (error) {
        console.error('Error loading clinic dropdowns:', error);
    }
}

// Load customers data (patients only)
async function loadCustomers() {
    try {
        // Add a loading indicator
        const customersTable = document.getElementById('customers-table');
        customersTable.innerHTML = '<tr><td colspan="7" class="text-center">Loading customers...</td></tr>';
        
        // Get patients data
        const response = await authorizedFetch('/api/patients/all');
        const patients = await response.json();
        
        // For debugging
        console.log("Patients data:", patients);
        
        if (!patients || patients.length === 0) {
            customersTable.innerHTML = '<tr><td colspan="7" class="text-center">No customers found</td></tr>';
            return;
        }
        
        // Create the HTML for the table
        let html = '';
        
        patients.forEach(patient => {
            // Handle different possible data structures
            const status = (patient.is_active !== undefined) ? patient.is_active : true;
            const statusBadge = status ? 
                '<span class="badge bg-success">Active</span>' : 
                '<span class="badge bg-danger">Inactive</span>';
            
            // Safely extract fields that might be nested or directly available
            const patientId = patient.id || '';
            const patientName = patient.name || '';
            const patientEmail = patient.email || '';
            const patientPhone = patient.phone || 'N/A';
            const patientDOB = patient.date_of_birth || 'N/A';
            const patientCreatedAt = patient.created_at || '';
            
            html += `
                <tr data-id="${patientId}">
                    <td>${patientId.substring(0, 8)}...</td>
                    <td>${patientName}</td>
                    <td>${patientEmail}</td>
                    <td>${patientPhone}</td>
                    <td>${patientDOB}</td>
                    <td>${formatDate(patientCreatedAt)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="window.AdminActions.viewCustomerProfile('${patientId}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.AdminActions.editCustomer('${patientId}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        customersTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customers-table').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load customers</td></tr>';
    }
}

// Load clinics data
async function loadClinics() {
    try {
        const response = await authorizedFetch('/api/clinics/all');
        const clinics = await response.json();
        
        const clinicsTable = document.getElementById('clinics-table');
        
        if (clinics.length === 0) {
            clinicsTable.innerHTML = '<tr><td colspan="7" class="text-center">No healthcare facilities found</td></tr>';
            return;
        }
        
        let html = '';
        
        clinics.forEach(clinic => {
            const status = clinic.user.is_active ? 
                '<span class="badge bg-success">Active</span>' : 
                '<span class="badge bg-danger">Inactive</span>';
            
            html += `
                <tr data-id="${clinic.id}">
                    <td>${clinic.id.substring(0, 8)}...</td>
                    <td>${clinic.user.name}</td>
                    <td>${clinic.specialization || 'General'}</td>
                    <td>${clinic.location || 'N/A'}</td>
                    <td>${clinic.phone || 'N/A'}</td>
                    <td>${status}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="window.AdminActions.viewClinicProfile('${clinic.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.AdminActions.editClinic('${clinic.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        clinicsTable.innerHTML = html;
        
        // Populate specialization filter
        populateSpecializationFilter(clinics);
        
    } catch (error) {
        console.error('Error loading clinics:', error);
        document.getElementById('clinics-table').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load healthcare facilities</td></tr>';
    }
}

// Populate specialization filter from available clinics
function populateSpecializationFilter(clinics) {
    const specializationFilter = document.getElementById('clinic-filter-specialization');
    
    // Get unique specializations
    const specializations = new Set();
    clinics.forEach(clinic => {
        if (clinic.specialization) {
            specializations.add(clinic.specialization);
        }
    });
    
    // Keep the "All Specializations" option
    let options = '<option value="all">All Specializations</option>';
    
    specializations.forEach(specialization => {
        options += `<option value="${specialization}">${specialization}</option>`;
    });
    
    specializationFilter.innerHTML = options;
}

// Load appointments data
async function loadAppointments() {
    try {
        const response = await authorizedFetch('/api/appointments/all');
        const appointments = await response.json();
        
        const appointmentsTable = document.getElementById('appointments-table');
        
        if (appointments.length === 0) {
            appointmentsTable.innerHTML = '<tr><td colspan="7" class="text-center">No appointments found</td></tr>';
            return;
        }
        
        let html = '';
        
        appointments.forEach(appointment => {
            const statusClass = getAppointmentStatusClass(appointment.status);
            
            html += `
                <tr data-id="${appointment.id}">
                    <td>${appointment.id.substring(0, 8)}...</td>
                    <td>${appointment.patient ? appointment.patient.user.name : appointment.patient_name || 'N/A'}</td>
                    <td>${appointment.clinic ? appointment.clinic.user.name : appointment.clinic_name || 'N/A'}</td>
                    <td>${appointment.service ? appointment.service.name : appointment.service_name || 'N/A'}</td>
                    <td>${appointment.date} at ${appointment.time}</td>
                    <td><span class="badge ${statusClass}">${appointment.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewAppointmentDetails('${appointment.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateAppointmentStatus('${appointment.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        appointmentsTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        document.getElementById('appointments-table').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load appointments</td></tr>';
    }
}

// Load orders data
async function loadOrders() {
    try {
        const response = await authorizedFetch('/api/products/orders/all');
        const orders = await response.json();
        
        const ordersTable = document.getElementById('orders-table');
        
        if (orders.length === 0) {
            ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }
        
        let html = '';
        
        orders.forEach(order => {
            const statusClass = getStatusClass(order.status);
            
            html += `
                <tr data-id="${order.id}">
                    <td>${order.id.substring(0, 8)}...</td>
                    <td>${order.patient ? order.patient.user.name : 'N/A'}</td>
                    <td>$${parseFloat(order.total).toFixed(2)}</td>
                    <td>${formatDate(order.created_at)}</td>
                    <td><span class="badge ${statusClass}">${order.status}</span></td>
                    <td>${order.points_earned || '0'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrderDetails('${order.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateOrderStatus('${order.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        ordersTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-table').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load orders</td></tr>';
    }
}

// Load reward data
async function loadRewardData() {
    try {
        const response = await authorizedFetch('/api/rewards/top-earners');
        const topEarners = await response.json();
        
        const rewardsTable = document.getElementById('rewards-table');
        
        if (topEarners.length === 0) {
            rewardsTable.innerHTML = '<tr><td colspan="6" class="text-center">No reward data found</td></tr>';
            return;
        }
        
        let html = '';
        
        topEarners.forEach(user => {
            const membershipLevel = getMembershipLevel(user.totalPoints);
            
            html += `
                <tr data-id="${user.patientId}">
                    <td>${user.name}</td>
                    <td>${user.totalPoints}</td>
                    <td>${user.redeemedPoints}</td>
                    <td>${user.currentBalance}</td>
                    <td><span class="badge bg-${getMembershipColor(membershipLevel)}">${membershipLevel}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewRewardHistory('${user.patientId}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="adjustPoints('${user.patientId}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        rewardsTable.innerHTML = html;
        
        // Also load partner shops
        loadPartnerShops();
        
    } catch (error) {
        console.error('Error loading reward data:', error);
        document.getElementById('rewards-table').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">Failed to load reward data</td></tr>';
    }
}

// Load partner shops
async function loadPartnerShops() {
    try {
        const response = await authorizedFetch('/api/rewards/partner-shops');
        const partners = await response.json();
        
        const partnersTable = document.getElementById('partners-table');
        
        if (partners.length === 0) {
            partnersTable.innerHTML = '<tr><td colspan="4" class="text-center">No partner shops found</td></tr>';
            return;
        }
        
        let html = '';
        
        partners.forEach(partner => {
            const categories = partner.categories ? 
                partner.categories.map(cat => cat.name).join(', ') : 'N/A';
            
            html += `
                <tr data-id="${partner.id}">
                    <td>${partner.name}</td>
                    <td>${partner.location || 'N/A'}</td>
                    <td>${categories}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editPartner('${partner.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePartner('${partner.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        partnersTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading partner shops:', error);
        document.getElementById('partners-table').innerHTML = 
            '<tr><td colspan="4" class="text-center text-danger">Failed to load partner shops</td></tr>';
    }
}

// Helper function to get membership level based on points
function getMembershipLevel(points) {
    if (points >= 10000) return 'Platinum';
    if (points >= 5000) return 'Gold';
    if (points >= 2000) return 'Silver';
    return 'Bronze';
}

// Helper function to get membership color
function getMembershipColor(level) {
    switch(level) {
        case 'Platinum': return 'secondary';
        case 'Gold': return 'warning';
        case 'Silver': return 'light text-dark';
        default: return 'danger';
    }
}

// Helper function to get status class for orders
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'processing': return 'bg-primary';
        case 'shipped': return 'bg-info';
        case 'delivered': return 'bg-success';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Helper function to get status class for appointments
function getAppointmentStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'pending': return 'bg-warning';
        case 'confirmed': return 'bg-primary';
        case 'completed': return 'bg-success';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Try parsing ISO string without timezone
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2].substr(0,2)}/${parts[0]}`;
        }
        return dateString;
    }
    
    return date.toLocaleDateString();
}

// Event handler for adding a new product
document.getElementById('add-product-btn')?.addEventListener('click', function() {
    alert('Product creation form will be implemented');
});

// Event handler for adding a new clinic
document.getElementById('add-clinic-btn')?.addEventListener('click', function() {
    alert('Clinic creation form will be implemented');
});

// Event handler for adding a new partner shop
document.getElementById('add-partner-btn')?.addEventListener('click', function() {
    alert('Partner shop creation form will be implemented');
});

// Event handlers for report generation
document.getElementById('generate-sales-report')?.addEventListener('click', function() {
    alert('Sales report generation will be implemented');
});

document.getElementById('generate-customer-report')?.addEventListener('click', function() {
    alert('Customer analytics report will be implemented');
});

document.getElementById('generate-inventory-report')?.addEventListener('click', function() {
    alert('Inventory report will be implemented');
});

// Admin action functions with full implementation
// Simple function to show a message with alert since Bootstrap toasts aren't working
function showMessage(message) {
    alert(message);
}

// Function to close any modal
function closeModal(modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // Remove backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

// View product details function - simplified and direct
function viewProductDetails(id) {
    // Find the product in the table
    const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
    if (!productRow) {
        showMessage('Product not found');
        return;
    }
    
    // Get data from the row
    const productName = productRow.querySelector('td:nth-child(2)').textContent;
    const productType = productRow.querySelector('td:nth-child(3)').textContent;
    const clinic = productRow.querySelector('td:nth-child(4)').textContent;
    const price = productRow.querySelector('td:nth-child(5)').textContent;
    
    // Update modal content
    document.getElementById('product-detail-name').textContent = productName;
    document.getElementById('product-detail-type').textContent = productType;
    document.getElementById('product-detail-clinic').textContent = clinic;
    document.getElementById('product-detail-price').textContent = price;
    document.getElementById('product-detail-id').textContent = id;
    
    // Show the modal with direct DOM access
    const modal = document.getElementById('productDetailsModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
    
    // Add close handlers to all close buttons
    modal.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.onclick = function() {
            closeModal(modal);
        };
    });
}

function editProduct(id) {
    // Open edit form in a modal
    // Find product and pre-fill the form
    const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
    if (productRow) {
        const productName = productRow.querySelector('td:nth-child(2)').textContent;
        const productType = productRow.querySelector('td:nth-child(3)').textContent;
        const clinic = productRow.querySelector('td:nth-child(4)').textContent;
        const price = productRow.querySelector('td:nth-child(5)').textContent.replace('$', '');
        
        // Set form values
        document.getElementById('edit-product-id').value = id;
        document.getElementById('edit-product-name').value = productName;
        document.getElementById('edit-product-type').value = productType;
        document.getElementById('edit-product-price').value = price;
        
        const modalElement = document.getElementById('productEditModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Add event listener for the save button
        document.getElementById('save-product-btn').onclick = function() {
            const form = document.getElementById('edit-product-form');
            if (form.checkValidity()) {
                const name = document.getElementById('edit-product-name').value;
                const type = document.getElementById('edit-product-type').value;
                const price = document.getElementById('edit-product-price').value;
                
                // Update the table row
                productRow.querySelector('td:nth-child(2)').textContent = name;
                productRow.querySelector('td:nth-child(3)').textContent = type;
                productRow.querySelector('td:nth-child(5)').textContent = '$' + parseFloat(price).toFixed(2);
                
                showNotification('Product updated successfully', 'success');
                bootstrap.Modal.getInstance(modalElement).hide();
            } else {
                form.reportValidity();
            }
        };
    } else {
        showNotification('Product not found for editing', 'error');
    }
}

function toggleProductStatus(id) {
    // Toggle product availability
    const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
    if (productRow) {
        const statusCell = productRow.querySelector('td:nth-child(6)');
        const currentStatus = statusCell.querySelector('.badge').textContent;
        
        // Toggle status
        if (currentStatus.includes('In Stock')) {
            statusCell.innerHTML = '<span class="badge bg-danger">Out of Stock</span>';
            showNotification('Product marked as Out of Stock', 'success');
        } else {
            statusCell.innerHTML = '<span class="badge bg-success">In Stock</span>';
            showNotification('Product marked as In Stock', 'success');
        }
    } else {
        showNotification('Product not found', 'error');
    }
}

function viewCustomerProfile(id) {
    // Show customer details in a modal
    // Find customer data
    const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
    if (customerRow) {
        const name = customerRow.querySelector('td:nth-child(2)').textContent;
        const email = customerRow.querySelector('td:nth-child(3)').textContent;
        const phone = customerRow.querySelector('td:nth-child(4)').textContent;
        
        // Update modal content
        document.getElementById('customer-detail-name').textContent = name;
        document.getElementById('customer-detail-email').textContent = email;
        document.getElementById('customer-detail-phone').textContent = phone;
        document.getElementById('customer-detail-id').textContent = id;
        
        const modalElement = document.getElementById('customerDetailsModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        showNotification('Customer details not found', 'error');
    }
}

function editCustomer(id) {
    // Show edit form for customer
    // Find customer data
    const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
    if (customerRow) {
        const name = customerRow.querySelector('td:nth-child(2)').textContent;
        const email = customerRow.querySelector('td:nth-child(3)').textContent;
        const phone = customerRow.querySelector('td:nth-child(4)').textContent;
        
        // Pre-fill form
        document.getElementById('edit-customer-id').value = id;
        document.getElementById('edit-customer-name').value = name;
        document.getElementById('edit-customer-email').value = email;
        document.getElementById('edit-customer-phone').value = phone;
        
        const modalElement = document.getElementById('customerEditModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Add event listener for the save button
        document.getElementById('save-customer-btn').onclick = function() {
            const form = document.getElementById('edit-customer-form');
            if (form.checkValidity()) {
                const updatedName = document.getElementById('edit-customer-name').value;
                const updatedEmail = document.getElementById('edit-customer-email').value;
                const updatedPhone = document.getElementById('edit-customer-phone').value;
                
                // Update the table row
                customerRow.querySelector('td:nth-child(2)').textContent = updatedName;
                customerRow.querySelector('td:nth-child(3)').textContent = updatedEmail;
                customerRow.querySelector('td:nth-child(4)').textContent = updatedPhone;
                
                showNotification('Customer updated successfully', 'success');
                bootstrap.Modal.getInstance(modalElement).hide();
            } else {
                form.reportValidity();
            }
        };
    } else {
        showNotification('Customer not found for editing', 'error');
    }
}

function viewClinicProfile(id) {
    // Show clinic details in a modal
    const modal = new bootstrap.Modal(document.getElementById('clinicDetailsModal') || createClinicDetailsModal());
    
    // Find clinic data
    const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
    if (clinicRow) {
        const name = clinicRow.querySelector('td:nth-child(2)').textContent;
        const specialization = clinicRow.querySelector('td:nth-child(3)').textContent;
        const location = clinicRow.querySelector('td:nth-child(4)').textContent;
        const phone = clinicRow.querySelector('td:nth-child(5)').textContent;
        
        // Update modal content
        document.getElementById('clinic-detail-name').textContent = name;
        document.getElementById('clinic-detail-specialization').textContent = specialization;
        document.getElementById('clinic-detail-location').textContent = location;
        document.getElementById('clinic-detail-phone').textContent = phone;
        document.getElementById('clinic-detail-id').textContent = id;
        
        modal.show();
    } else {
        showNotification('Clinic details not found', 'error');
    }
}

function editClinic(id) {
    // Show edit form for clinic
    const modal = new bootstrap.Modal(document.getElementById('clinicEditModal') || createClinicEditModal());
    
    // Find clinic data
    const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
    if (clinicRow) {
        const name = clinicRow.querySelector('td:nth-child(2)').textContent;
        const specialization = clinicRow.querySelector('td:nth-child(3)').textContent;
        const location = clinicRow.querySelector('td:nth-child(4)').textContent;
        const phone = clinicRow.querySelector('td:nth-child(5)').textContent;
        
        // Pre-fill form
        document.getElementById('edit-clinic-id').value = id;
        document.getElementById('edit-clinic-name').value = name;
        document.getElementById('edit-clinic-specialization').value = specialization;
        document.getElementById('edit-clinic-location').value = location;
        document.getElementById('edit-clinic-phone').value = phone;
        
        modal.show();
    } else {
        showNotification('Clinic not found for editing', 'error');
    }
}

function viewAppointmentDetails(id) {
    // Show appointment details in a modal
    const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal') || createAppointmentDetailsModal());
    
    // Find appointment data
    const appointmentRow = document.querySelector(`#appointments-table tr[data-id="${id}"]`);
    if (appointmentRow) {
        const patientName = appointmentRow.querySelector('td:nth-child(2)').textContent;
        const clinicName = appointmentRow.querySelector('td:nth-child(3)').textContent;
        const service = appointmentRow.querySelector('td:nth-child(4)').textContent;
        const dateTime = appointmentRow.querySelector('td:nth-child(5)').textContent;
        const status = appointmentRow.querySelector('td:nth-child(6) .badge').textContent;
        
        // Update modal content
        document.getElementById('appointment-detail-patient').textContent = patientName;
        document.getElementById('appointment-detail-clinic').textContent = clinicName;
        document.getElementById('appointment-detail-service').textContent = service;
        document.getElementById('appointment-detail-datetime').textContent = dateTime;
        document.getElementById('appointment-detail-status').textContent = status;
        document.getElementById('appointment-detail-id').textContent = id;
        
        modal.show();
    } else {
        showNotification('Appointment details not found', 'error');
    }
}

function updateAppointmentStatus(id) {
    // Show status update dropdown
    const statusOptions = ['pending', 'confirmed', 'cancelled', 'completed'];
    const appointmentRow = document.querySelector(`#appointments-table tr[data-id="${id}"]`);
    
    if (appointmentRow) {
        const statusCell = appointmentRow.querySelector('td:nth-child(6)');
        const currentStatus = statusCell.querySelector('.badge').textContent.toLowerCase();
        
        // Create dropdown for status change
        let dropdown = document.createElement('select');
        dropdown.classList.add('form-select', 'form-select-sm');
        dropdown.id = `status-select-${id}`;
        
        statusOptions.forEach(status => {
            let option = document.createElement('option');
            option.value = status;
            option.text = status.charAt(0).toUpperCase() + status.slice(1);
            if (status === currentStatus) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
        
        // Create save button
        let saveBtn = document.createElement('button');
        saveBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'mt-1');
        saveBtn.textContent = 'Save';
        saveBtn.onclick = function() {
            const newStatus = dropdown.value;
            const statusBadgeClass = getAppointmentStatusClass(newStatus);
            statusCell.innerHTML = `<span class="badge ${statusBadgeClass}">${newStatus}</span>`;
            showNotification(`Appointment status updated to ${newStatus}`, 'success');
        };
        
        // Replace status with dropdown and button
        statusCell.innerHTML = '';
        statusCell.appendChild(dropdown);
        statusCell.appendChild(saveBtn);
    } else {
        showNotification('Appointment not found', 'error');
    }
}

function viewOrderDetails(id) {
    // Show order details in a modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal') || createOrderDetailsModal());
    
    // Find order data
    const orderRow = document.querySelector(`#orders-table tr[data-id="${id}"]`);
    if (orderRow) {
        const patient = orderRow.querySelector('td:nth-child(2)').textContent;
        const total = orderRow.querySelector('td:nth-child(4)').textContent;
        const status = orderRow.querySelector('td:nth-child(5) .badge').textContent;
        
        // Update modal content
        document.getElementById('order-detail-patient').textContent = patient;
        document.getElementById('order-detail-total').textContent = total;
        document.getElementById('order-detail-status').textContent = status;
        document.getElementById('order-detail-id').textContent = id;
        
        modal.show();
    } else {
        showNotification('Order details not found', 'error');
    }
}

function updateOrderStatus(id) {
    // Show status update dropdown for orders
    const statusOptions = ['processing', 'shipped', 'delivered', 'cancelled'];
    const orderRow = document.querySelector(`#orders-table tr[data-id="${id}"]`);
    
    if (orderRow) {
        const statusCell = orderRow.querySelector('td:nth-child(5)');
        const currentStatus = statusCell.querySelector('.badge').textContent.toLowerCase();
        
        // Create dropdown for status change
        let dropdown = document.createElement('select');
        dropdown.classList.add('form-select', 'form-select-sm');
        dropdown.id = `order-status-select-${id}`;
        
        statusOptions.forEach(status => {
            let option = document.createElement('option');
            option.value = status;
            option.text = status.charAt(0).toUpperCase() + status.slice(1);
            if (status === currentStatus) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
        
        // Create save button
        let saveBtn = document.createElement('button');
        saveBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'mt-1');
        saveBtn.textContent = 'Save';
        saveBtn.onclick = function() {
            const newStatus = dropdown.value;
            const statusBadgeClass = getStatusClass(newStatus);
            statusCell.innerHTML = `<span class="badge ${statusBadgeClass}">${newStatus}</span>`;
            showNotification(`Order status updated to ${newStatus}`, 'success');
        };
        
        // Replace status with dropdown and button
        statusCell.innerHTML = '';
        statusCell.appendChild(dropdown);
        statusCell.appendChild(saveBtn);
    } else {
        showNotification('Order not found', 'error');
    }
}

// Rewards system actions
function viewRewardHistory(id) {
    // Get reward history for a patient
    const modal = new bootstrap.Modal(document.getElementById('rewardHistoryModal') || createRewardHistoryModal());
    
    // Find patient data
    const patientRow = document.querySelector(`tr[data-id="${id}"]`);
    if (patientRow) {
        const patientName = patientRow.querySelector('td:nth-child(2)').textContent;
        
        // Update modal title
        document.getElementById('reward-history-patient-name').textContent = patientName;
        document.getElementById('reward-history-patient-id').textContent = id;
        
        // Sample reward history (in production, this would come from API)
        const rewardHistory = [
            { date: '2025-05-01', points: '+50', description: 'Purchase at Central Health Clinic' },
            { date: '2025-04-15', points: '+25', description: 'Monthly medication order' },
            { date: '2025-04-10', points: '-100', description: 'Redeemed at Partner Shop' },
            { date: '2025-03-22', points: '+75', description: 'Annual checkup completed' }
        ];
        
        // Populate table
        const historyTable = document.getElementById('reward-history-table');
        historyTable.innerHTML = '';
        
        rewardHistory.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${record.points}</td>
                <td>${record.description}</td>
            `;
            historyTable.appendChild(row);
        });
        
        modal.show();
    } else {
        showNotification('Patient not found', 'error');
    }
}

function adjustPoints(id) {
    // Adjust reward points for a patient
    const modal = new bootstrap.Modal(document.getElementById('adjustPointsModal') || createAdjustPointsModal());
    
    // Find patient data
    const patientRow = document.querySelector(`tr[data-id="${id}"]`);
    if (patientRow) {
        const patientName = patientRow.querySelector('td:nth-child(2)').textContent;
        
        // Update modal content
        document.getElementById('adjust-points-patient-name').textContent = patientName;
        document.getElementById('adjust-points-patient-id').value = id;
        
        modal.show();
    } else {
        showNotification('Patient not found', 'error');
    }
}

// Partner shop actions
function editPartner(id) {
    // Edit partner shop details
    const modal = new bootstrap.Modal(document.getElementById('partnerEditModal') || createPartnerEditModal());
    
    // Find partner data
    const partnerRow = document.querySelector(`#partner-shops-table tr[data-id="${id}"]`);
    if (partnerRow) {
        const name = partnerRow.querySelector('td:nth-child(2)').textContent;
        const location = partnerRow.querySelector('td:nth-child(3)').textContent;
        
        // Pre-fill form
        document.getElementById('edit-partner-id').value = id;
        document.getElementById('edit-partner-name').value = name;
        document.getElementById('edit-partner-location').value = location;
        
        modal.show();
    } else {
        showNotification('Partner shop not found for editing', 'error');
    }
}

function deletePartner(id) {
    // Delete partner shop with confirmation
    if (confirm('Are you sure you want to delete this partner shop? This action cannot be undone.')) {
        const partnerRow = document.querySelector(`#partner-shops-table tr[data-id="${id}"]`);
        
        if (partnerRow) {
            // Remove the row
            partnerRow.remove();
            showNotification('Partner shop successfully deleted', 'success');
        } else {
            showNotification('Partner shop not found', 'error');
        }
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create a toast notification
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.classList.add('toast', 'show');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Set toast color based on type
    const bgClass = type === 'success' ? 'bg-success' : 
                    type === 'error' ? 'bg-danger' : 
                    type === 'warning' ? 'bg-warning' : 'bg-info';
    
    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <strong class="me-auto">Admin Dashboard</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Helper functions to create modals if they don't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

function createProductDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'productDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Product Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> <span id="product-detail-name"></span></p>
                    <p><strong>Type:</strong> <span id="product-detail-type"></span></p>
                    <p><strong>Clinic:</strong> <span id="product-detail-clinic"></span></p>
                    <p><strong>Price:</strong> <span id="product-detail-price"></span></p>
                    <p><strong>ID:</strong> <span id="product-detail-id"></span></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createProductEditModal() {
    const modal = document.createElement('div');
    modal.id = 'productEditModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Product</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-product-form">
                        <input type="hidden" id="edit-product-id">
                        <div class="mb-3">
                            <label for="edit-product-name" class="form-label">Product Name</label>
                            <input type="text" class="form-control" id="edit-product-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit-product-type" class="form-label">Type/Category</label>
                            <input type="text" class="form-control" id="edit-product-type">
                        </div>
                        <div class="mb-3">
                            <label for="edit-product-price" class="form-label">Price ($)</label>
                            <input type="number" step="0.01" class="form-control" id="edit-product-price" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-product-btn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to save button
    modal.querySelector('#save-product-btn').addEventListener('click', function() {
        const form = document.getElementById('edit-product-form');
        if (form.checkValidity()) {
            const id = document.getElementById('edit-product-id').value;
            const name = document.getElementById('edit-product-name').value;
            const type = document.getElementById('edit-product-type').value;
            const price = document.getElementById('edit-product-price').value;
            
            // Find and update the product in the table
            const productRow = document.querySelector(`#products-table tr[data-id="${id}"]`);
            if (productRow) {
                productRow.querySelector('td:nth-child(2)').textContent = name;
                productRow.querySelector('td:nth-child(3)').textContent = type;
                productRow.querySelector('td:nth-child(5)').textContent = '$' + parseFloat(price).toFixed(2);
                
                showNotification('Product updated successfully', 'success');
                bootstrap.Modal.getInstance(modal).hide();
            }
        } else {
            form.reportValidity();
        }
    });
    
    return modal;
}

function createCustomerDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'customerDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Customer Profile</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> <span id="customer-detail-name"></span></p>
                    <p><strong>Email:</strong> <span id="customer-detail-email"></span></p>
                    <p><strong>Phone:</strong> <span id="customer-detail-phone"></span></p>
                    <p><strong>ID:</strong> <span id="customer-detail-id"></span></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createCustomerEditModal() {
    const modal = document.createElement('div');
    modal.id = 'customerEditModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Customer</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-customer-form">
                        <input type="hidden" id="edit-customer-id">
                        <div class="mb-3">
                            <label for="edit-customer-name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="edit-customer-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit-customer-email" class="form-label">Email</label>
                            <input type="email" class="form-control" id="edit-customer-email" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit-customer-phone" class="form-label">Phone</label>
                            <input type="tel" class="form-control" id="edit-customer-phone">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-customer-btn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to save button
    modal.querySelector('#save-customer-btn').addEventListener('click', function() {
        const form = document.getElementById('edit-customer-form');
        if (form.checkValidity()) {
            const id = document.getElementById('edit-customer-id').value;
            const name = document.getElementById('edit-customer-name').value;
            const email = document.getElementById('edit-customer-email').value;
            const phone = document.getElementById('edit-customer-phone').value;
            
            // Find and update the customer in the table
            const customerRow = document.querySelector(`#customers-table tr[data-id="${id}"]`);
            if (customerRow) {
                customerRow.querySelector('td:nth-child(2)').textContent = name;
                customerRow.querySelector('td:nth-child(3)').textContent = email;
                customerRow.querySelector('td:nth-child(4)').textContent = phone;
                
                showNotification('Customer updated successfully', 'success');
                bootstrap.Modal.getInstance(modal).hide();
            }
        } else {
            form.reportValidity();
        }
    });
    
    return modal;
}

function createClinicDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'clinicDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Clinic Profile</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> <span id="clinic-detail-name"></span></p>
                    <p><strong>Specialization:</strong> <span id="clinic-detail-specialization"></span></p>
                    <p><strong>Location:</strong> <span id="clinic-detail-location"></span></p>
                    <p><strong>Phone:</strong> <span id="clinic-detail-phone"></span></p>
                    <p><strong>ID:</strong> <span id="clinic-detail-id"></span></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createClinicEditModal() {
    const modal = document.createElement('div');
    modal.id = 'clinicEditModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Clinic</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-clinic-form">
                        <input type="hidden" id="edit-clinic-id">
                        <div class="mb-3">
                            <label for="edit-clinic-name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="edit-clinic-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit-clinic-specialization" class="form-label">Specialization</label>
                            <input type="text" class="form-control" id="edit-clinic-specialization">
                        </div>
                        <div class="mb-3">
                            <label for="edit-clinic-location" class="form-label">Location</label>
                            <input type="text" class="form-control" id="edit-clinic-location">
                        </div>
                        <div class="mb-3">
                            <label for="edit-clinic-phone" class="form-label">Phone</label>
                            <input type="tel" class="form-control" id="edit-clinic-phone">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-clinic-btn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to save button
    modal.querySelector('#save-clinic-btn').addEventListener('click', function() {
        const form = document.getElementById('edit-clinic-form');
        if (form.checkValidity()) {
            const id = document.getElementById('edit-clinic-id').value;
            const name = document.getElementById('edit-clinic-name').value;
            const specialization = document.getElementById('edit-clinic-specialization').value;
            const location = document.getElementById('edit-clinic-location').value;
            const phone = document.getElementById('edit-clinic-phone').value;
            
            // Find and update the clinic in the table
            const clinicRow = document.querySelector(`#clinics-table tr[data-id="${id}"]`);
            if (clinicRow) {
                clinicRow.querySelector('td:nth-child(2)').textContent = name;
                clinicRow.querySelector('td:nth-child(3)').textContent = specialization;
                clinicRow.querySelector('td:nth-child(4)').textContent = location;
                clinicRow.querySelector('td:nth-child(5)').textContent = phone;
                
                showNotification('Clinic updated successfully', 'success');
                bootstrap.Modal.getInstance(modal).hide();
            }
        } else {
            form.reportValidity();
        }
    });
    
    return modal;
}

function createAppointmentDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'appointmentDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Appointment Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Patient:</strong> <span id="appointment-detail-patient"></span></p>
                    <p><strong>Clinic:</strong> <span id="appointment-detail-clinic"></span></p>
                    <p><strong>Service:</strong> <span id="appointment-detail-service"></span></p>
                    <p><strong>Date/Time:</strong> <span id="appointment-detail-datetime"></span></p>
                    <p><strong>Status:</strong> <span id="appointment-detail-status"></span></p>
                    <p><strong>ID:</strong> <span id="appointment-detail-id"></span></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createOrderDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'orderDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Patient:</strong> <span id="order-detail-patient"></span></p>
                    <p><strong>Total:</strong> <span id="order-detail-total"></span></p>
                    <p><strong>Status:</strong> <span id="order-detail-status"></span></p>
                    <p><strong>ID:</strong> <span id="order-detail-id"></span></p>
                    <hr>
                    <h6>Order Items</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody id="order-items-table">
                                <tr>
                                    <td colspan="3" class="text-center">Sample items will appear here</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createRewardHistoryModal() {
    const modal = document.createElement('div');
    modal.id = 'rewardHistoryModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Reward History for <span id="reward-history-patient-name"></span></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="reward-history-patient-id">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Points</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody id="reward-history-table">
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function createAdjustPointsModal() {
    const modal = document.createElement('div');
    modal.id = 'adjustPointsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Adjust Points for <span id="adjust-points-patient-name"></span></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="adjust-points-form">
                        <input type="hidden" id="adjust-points-patient-id">
                        <div class="mb-3">
                            <label for="points-amount" class="form-label">Points Amount</label>
                            <input type="number" class="form-control" id="points-amount" required>
                            <div class="form-text">Enter positive value to add points, negative to deduct.</div>
                        </div>
                        <div class="mb-3">
                            <label for="points-reason" class="form-label">Reason</label>
                            <input type="text" class="form-control" id="points-reason" required>
                            <div class="form-text">Provide a reason for this points adjustment.</div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-points-btn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to save button
    modal.querySelector('#save-points-btn').addEventListener('click', function() {
        const form = document.getElementById('adjust-points-form');
        if (form.checkValidity()) {
            const patientId = document.getElementById('adjust-points-patient-id').value;
            const points = document.getElementById('points-amount').value;
            const reason = document.getElementById('points-reason').value;
            
            // In a real app, this would update the database
            showNotification(`Successfully ${parseInt(points) > 0 ? 'added' : 'deducted'} ${Math.abs(points)} points for patient. Reason: ${reason}`, 'success');
            bootstrap.Modal.getInstance(modal).hide();
        } else {
            form.reportValidity();
        }
    });
    
    return modal;
}

function createPartnerEditModal() {
    const modal = document.createElement('div');
    modal.id = 'partnerEditModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Partner Shop</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-partner-form">
                        <input type="hidden" id="edit-partner-id">
                        <div class="mb-3">
                            <label for="edit-partner-name" class="form-label">Shop Name</label>
                            <input type="text" class="form-control" id="edit-partner-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit-partner-location" class="form-label">Location</label>
                            <input type="text" class="form-control" id="edit-partner-location">
                        </div>
                        <div class="mb-3">
                            <label for="edit-partner-website" class="form-label">Website</label>
                            <input type="url" class="form-control" id="edit-partner-website">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-partner-btn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to save button
    modal.querySelector('#save-partner-btn').addEventListener('click', function() {
        const form = document.getElementById('edit-partner-form');
        if (form.checkValidity()) {
            const id = document.getElementById('edit-partner-id').value;
            const name = document.getElementById('edit-partner-name').value;
            const location = document.getElementById('edit-partner-location').value;
            
            // Find and update the partner in the table
            const partnerRow = document.querySelector(`#partner-shops-table tr[data-id="${id}"]`);
            if (partnerRow) {
                partnerRow.querySelector('td:nth-child(2)').textContent = name;
                partnerRow.querySelector('td:nth-child(3)').textContent = location;
                
                showNotification('Partner shop updated successfully', 'success');
                bootstrap.Modal.getInstance(modal).hide();
            }
        } else {
            form.reportValidity();
        }
    });
    
    return modal;
}