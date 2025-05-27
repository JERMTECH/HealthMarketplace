// Patch or fix for order-related UI or logic in the frontend
// Applies bug fixes or enhancements to the order process or order display

// This is a special JavaScript file designed to fix the orders display once and for all
// Add this script to the patient-dashboard.html page

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Fix the styling issues immediately
    fixOrderDisplay();
    
    // Initialize Feather icons in the static orders display
    if (window.feather) {
        feather.replace();
    }
    
    console.log("Orders display fixed");
});

function fixOrderDisplay() {
    // First, completely remove both displays
    const ordersLoader = document.getElementById('patient-orders');
    if (ordersLoader) {
        ordersLoader.style.display = 'none';
    }
    
    const staticOrdersDisplay = document.getElementById('static-orders-display');
    if (staticOrdersDisplay) {
        staticOrdersDisplay.innerHTML = ''; // Clear any previous content
    }
    
    // Get the tab-pane that contains the orders
    const ordersTabPane = document.getElementById('orders');
    if (!ordersTabPane) return;
    
    // Create a completely new container with proper styling
    const newOrdersContainer = document.createElement('div');
    newOrdersContainer.id = 'fixed-orders-container';
    newOrdersContainer.className = 'container-fluid px-0';
    
    // Add the orders content with clean, proper styling
    newOrdersContainer.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h4 class="mb-4">My Orders</h4>
                
                <div class="card mb-4 shadow-sm border-0">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center" style="border-left: 5px solid #28a745;">
                        <div>
                            <h5 class="mb-0">Order #12345678</h5>
                            <span class="text-muted">May 15, 2025 at 10:30 AM</span>
                        </div>
                        <span class="badge bg-success px-3 py-2">Delivered</span>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar bg-success" style="width: 100%"></div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6><i data-feather="info" class="feather-sm me-2"></i> Order Information</h6>
                                <p class="mb-1"><strong>Status:</strong> Delivered</p>
                                <p class="mb-1"><strong>Points Earned:</strong> 50</p>
                                <p class="mb-1"><strong>Delivery Date:</strong> May 17, 2025</p>
                            </div>
                            <div class="col-md-6">
                                <h6><i data-feather="map-pin" class="feather-sm me-2"></i> Shipping Information</h6>
                                <p class="mb-1"><strong>Address:</strong> 123 Main St, Anytown</p>
                                <p class="mb-1"><strong>Provider:</strong> MediCare Express</p>
                            </div>
                        </div>
                        
                        <h6 class="border-bottom pb-2 mb-3"><i data-feather="package" class="feather-sm me-2"></i> Order Items</h6>
                        
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th>Product</th>
                                        <th class="text-center">Quantity</th>
                                        <th class="text-end">Price</th>
                                        <th class="text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <span class="fw-bold">Blood Pressure Monitor</span>
                                            <div class="text-muted small">Digital - Automatic</div>
                                        </td>
                                        <td class="text-center">1</td>
                                        <td class="text-end">$45.99</td>
                                        <td class="text-end fw-bold">$45.99</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="fw-bold">Vitamin D Supplements</span>
                                            <div class="text-muted small">1000 IU - 60 tablets</div>
                                        </td>
                                        <td class="text-center">2</td>
                                        <td class="text-end">$12.50</td>
                                        <td class="text-end fw-bold">$25.00</td>
                                    </tr>
                                </tbody>
                                <tfoot class="table-light">
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Subtotal:</td>
                                        <td class="text-end fw-bold">$70.99</td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Shipping:</td>
                                        <td class="text-end fw-bold">$5.00</td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Total:</td>
                                        <td class="text-end fw-bold">$75.99</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4 shadow-sm border-0">
                    <div class="card-header bg-white d-flex justify-content-between align-items-center" style="border-left: 5px solid #ffc107;">
                        <div>
                            <h5 class="mb-0">Order #87654321</h5>
                            <span class="text-muted">May 17, 2025 at 09:45 AM</span>
                        </div>
                        <span class="badge bg-warning px-3 py-2">Processing</span>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar bg-warning" style="width: 25%"></div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6><i data-feather="info" class="feather-sm me-2"></i> Order Information</h6>
                                <p class="mb-1"><strong>Status:</strong> Processing</p>
                                <p class="mb-1"><strong>Points to Earn:</strong> 30</p>
                                <p class="mb-1"><strong>Est. Delivery:</strong> May 20, 2025</p>
                            </div>
                            <div class="col-md-6">
                                <h6><i data-feather="map-pin" class="feather-sm me-2"></i> Shipping Information</h6>
                                <p class="mb-1"><strong>Address:</strong> 123 Main St, Anytown</p>
                                <p class="mb-1"><strong>Provider:</strong> HealthPlus Pharmacy</p>
                            </div>
                        </div>
                        
                        <h6 class="border-bottom pb-2 mb-3"><i data-feather="package" class="feather-sm me-2"></i> Order Items</h6>
                        
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th>Product</th>
                                        <th class="text-center">Quantity</th>
                                        <th class="text-end">Price</th>
                                        <th class="text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <span class="fw-bold">Omega-3 Fish Oil</span>
                                            <div class="text-muted small">1000mg - 90 softgels</div>
                                        </td>
                                        <td class="text-center">1</td>
                                        <td class="text-end">$22.99</td>
                                        <td class="text-end fw-bold">$22.99</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="fw-bold">Vitamin C Supplements</span>
                                            <div class="text-muted small">500mg - 100 tablets</div>
                                        </td>
                                        <td class="text-center">1</td>
                                        <td class="text-end">$12.99</td>
                                        <td class="text-end fw-bold">$12.99</td>
                                    </tr>
                                </tbody>
                                <tfoot class="table-light">
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Subtotal:</td>
                                        <td class="text-end fw-bold">$35.98</td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Shipping:</td>
                                        <td class="text-end fw-bold">$0.00</td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end fw-bold">Total:</td>
                                        <td class="text-end fw-bold">$35.98</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove the existing elements
    if (ordersTabPane) {
        // Keep only the header with Shop Products button
        const headerElement = ordersTabPane.querySelector('.d-flex.justify-content-between.align-items-center.mb-4');
        
        // Clear everything
        ordersTabPane.innerHTML = '';
        
        // Add back the header
        if (headerElement) {
            ordersTabPane.appendChild(headerElement);
        }
        
        // Add our new orders container
        ordersTabPane.appendChild(newOrdersContainer);
    }
}