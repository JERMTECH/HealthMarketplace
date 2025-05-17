// This is a special JavaScript file designed to fix the orders display once and for all
// Add this script to the patient-dashboard.html page

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Hide the default orders loader
    const ordersLoader = document.getElementById('patient-orders');
    if (ordersLoader) {
        ordersLoader.style.display = 'none';
    }
    
    // Make sure the static orders display is visible
    const staticOrdersDisplay = document.getElementById('static-orders-display');
    if (staticOrdersDisplay) {
        staticOrdersDisplay.style.display = 'block';
    }
    
    // Initialize Feather icons in the static orders display
    if (window.feather) {
        feather.replace();
    }
    
    console.log("Static orders display activated");
});