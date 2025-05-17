// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    validateAdminAccess();
    
    // Set up menu navigation
    setupMenuNavigation();
    
    // Load dashboard data
    loadDashboardStatistics();
    
    // Setup logout functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
        window.location.href = '/pages/login.html';
    });
});

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
            
            html += `
                <tr>
                    <td>${product.id.substring(0, 8)}...</td>
                    <td>${product.name}</td>
                    <td>Product</td>
                    <td>${product.clinic ? product.clinic.name : 'N/A'}</td>
                    <td>$${parseFloat(product.price).toFixed(2)}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewProductDetails('${product.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editProduct('${product.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleProductStatus('${product.id}')">
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
        const patientsResponse = await authorizedFetch('/api/patients/all');
        const patients = await patientsResponse.json();
        
        if (patients.length === 0) {
            customersTable.innerHTML = '<tr><td colspan="7" class="text-center">No customers found</td></tr>';
            return;
        }
        
        // Create the HTML for the table
        let html = '';
        
        patients.forEach(patient => {
            const status = patient.is_active ? 
                '<span class="badge bg-success">Active</span>' : 
                '<span class="badge bg-danger">Inactive</span>';
            
            html += `
                <tr>
                    <td>${patient.id.substring(0, 8)}...</td>
                    <td>${patient.name}</td>
                    <td>${patient.email}</td>
                    <td>${patient.phone || 'N/A'}</td>
                    <td>${patient.date_of_birth || 'N/A'}</td>
                    <td>${formatDate(patient.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomerProfile('${patient.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editCustomer('${patient.id}')">
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
                <tr>
                    <td>${clinic.id.substring(0, 8)}...</td>
                    <td>${clinic.user.name}</td>
                    <td>${clinic.specialization || 'General'}</td>
                    <td>${clinic.location || 'N/A'}</td>
                    <td>${clinic.phone || 'N/A'}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="viewClinicProfile('${clinic.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editClinic('${clinic.id}')">
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
                <tr>
                    <td>${appointment.id.substring(0, 8)}...</td>
                    <td>${appointment.patient ? appointment.patient.user.name : 'N/A'}</td>
                    <td>${appointment.clinic ? appointment.clinic.user.name : 'N/A'}</td>
                    <td>${appointment.service ? appointment.service.name : 'N/A'}</td>
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
                <tr>
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
                <tr>
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
                <tr>
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

// Export functions (these would be implemented fully in production)
function viewProductDetails(id) {
    alert(`View product details for ID: ${id}`);
}

function editProduct(id) {
    alert(`Edit product with ID: ${id}`);
}

function toggleProductStatus(id) {
    alert(`Toggle status for product ID: ${id}`);
}

function viewCustomerProfile(id) {
    alert(`View customer profile for ID: ${id}`);
}

function editCustomer(id) {
    alert(`Edit customer with ID: ${id}`);
}

function viewClinicProfile(id) {
    alert(`View clinic profile for ID: ${id}`);
}

function editClinic(id) {
    alert(`Edit clinic with ID: ${id}`);
}

function viewAppointmentDetails(id) {
    alert(`View appointment details for ID: ${id}`);
}

function updateAppointmentStatus(id) {
    alert(`Update status for appointment ID: ${id}`);
}

function viewOrderDetails(id) {
    alert(`View order details for ID: ${id}`);
}

function updateOrderStatus(id) {
    alert(`Update status for order ID: ${id}`);
}

function viewRewardHistory(id) {
    alert(`View reward history for patient ID: ${id}`);
}

function adjustPoints(id) {
    alert(`Adjust points for patient ID: ${id}`);
}

function editPartner(id) {
    alert(`Edit partner shop with ID: ${id}`);
}

function deletePartner(id) {
    alert(`Delete partner shop with ID: ${id}`);
}