// Handles admin-specific actions for the frontend
// Manages admin operations such as approving clinics, managing users, or moderating content

// Global admin dashboard action functions

// Product actions
function showProductDetails(id, name, type, clinic, price) {
    try {
        // Update modal content
        document.getElementById('product-detail-name').textContent = name;
        document.getElementById('product-detail-type').textContent = type;
        document.getElementById('product-detail-clinic').textContent = clinic;
        document.getElementById('product-detail-price').textContent = price;
        document.getElementById('product-detail-id').textContent = id;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('productDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing product details:', error);
        alert('Error showing product details: ' + error.message);
    }
}

function showProductEdit(id, name, type, price) {
    try {
        // Fill form
        document.getElementById('edit-product-id').value = id;
        document.getElementById('edit-product-name').value = name;
        document.getElementById('edit-product-type').value = type;
        document.getElementById('edit-product-price').value = price;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('productEditModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing product:', error);
        alert('Error editing product: ' + error.message);
    }
}

function toggleProductStatus(id, currentStatus) {
    try {
        // Find row
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (!row) {
            alert('Product row not found');
            return;
        }
        
        const statusCell = row.querySelector('td:nth-child(6)');
        if (!statusCell) {
            alert('Status cell not found');
            return;
        }
        
        // Toggle status
        if (currentStatus) {
            statusCell.innerHTML = '<span class="badge bg-danger">Out of Stock</span>';
            alert('Product marked as Out of Stock');
        } else {
            statusCell.innerHTML = '<span class="badge bg-success">In Stock</span>';
            alert('Product marked as In Stock');
        }
        
        // In a real implementation, this would call an API
    } catch (error) {
        console.error('Error toggling product status:', error);
        alert('Error toggling product status: ' + error.message);
    }
}

// Customer actions
function viewCustomerProfile(id, name, email, phone) {
    try {
        // Update modal
        document.getElementById('customer-detail-name').textContent = name;
        document.getElementById('customer-detail-email').textContent = email;
        document.getElementById('customer-detail-phone').textContent = phone;
        document.getElementById('customer-detail-id').textContent = id;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('customerDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing customer details:', error);
        alert('Error showing customer details: ' + error.message);
    }
}

function editCustomer(id, name, email, phone) {
    try {
        // Fill form
        document.getElementById('edit-customer-id').value = id;
        document.getElementById('edit-customer-name').value = name;
        document.getElementById('edit-customer-email').value = email;
        document.getElementById('edit-customer-phone').value = phone;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('customerEditModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing customer:', error);
        alert('Error editing customer: ' + error.message);
    }
}

// Clinic actions
function viewClinicProfile(id, name, specialization, location, phone) {
    try {
        // Update modal
        document.getElementById('clinic-detail-name').textContent = name;
        document.getElementById('clinic-detail-specialization').textContent = specialization;
        document.getElementById('clinic-detail-location').textContent = location;
        document.getElementById('clinic-detail-phone').textContent = phone;
        document.getElementById('clinic-detail-id').textContent = id;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('clinicDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing clinic details:', error);
        alert('Error showing clinic details: ' + error.message);
    }
}

function editClinic(id, name, specialization, location, phone) {
    try {
        // Fill form
        document.getElementById('edit-clinic-id').value = id;
        document.getElementById('edit-clinic-name').value = name;
        document.getElementById('edit-clinic-specialization').value = specialization;
        document.getElementById('edit-clinic-location').value = location;
        document.getElementById('edit-clinic-phone').value = phone;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('clinicEditModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing clinic:', error);
        alert('Error editing clinic: ' + error.message);
    }
}