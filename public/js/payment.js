// Manages payment processing UI and logic for the frontend
// Handles payment forms, validation, and communicates with the backend for payment processing

// Payment Processing Logic

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html?returnUrl=/pages/cart.html';
        return;
    }

    // Load cart and display items
    loadCartContents();

    // Set up form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processPayment);
    }

    // Cancel button returns to cart
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            window.location.href = '/pages/cart.html';
        });
    }

    // Retry button resets the payment form
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            showPaymentForm();
        });
    }
});

// Load cart contents and display in the summary
function loadCartContents() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        // No items in cart, redirect to cart page
        window.location.href = '/pages/cart.html';
        return;
    }

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Display order items
    const orderItemsElement = document.getElementById('order-items');
    let itemsHTML = '';
    
    cart.forEach(item => {
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        itemsHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td>$${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    orderItemsElement.innerHTML = itemsHTML;
    
    // Update total price display
    document.getElementById('order-total').textContent = `$${total.toFixed(2)}`;
    document.getElementById('pay-amount').textContent = `$${total.toFixed(2)}`;
}

// Process payment submission
function processPayment(event) {
    event.preventDefault();
    
    // Show processing state
    document.getElementById('payment-form').style.display = 'none';
    document.getElementById('payment-processing').style.display = 'block';
    
    // Get cart data
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Create order data structure
    const orderData = {
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity.toString()
        }))
    };
    
    // Simulate payment processing delay (2 seconds)
    setTimeout(() => {
        // Send order to backend
        submitOrder(orderData);
    }, 2000);
}

// Submit order to the backend
function submitOrder(orderData) {
    const token = localStorage.getItem('token');
    
    fetch('/api/products/order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error creating order');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        showPaymentSuccess();
        
        // Clear cart
        localStorage.setItem('cart', JSON.stringify([]));
    })
    .catch(error => {
        console.error('Error creating order:', error);
        showPaymentError('There was an error processing your order. Please try again.');
    });
}

// Show payment success message
function showPaymentSuccess() {
    document.getElementById('payment-processing').style.display = 'none';
    document.getElementById('payment-success').style.display = 'block';
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Show payment error message
function showPaymentError(message) {
    document.getElementById('payment-processing').style.display = 'none';
    document.getElementById('payment-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
    
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Show payment form (reset from error state)
function showPaymentForm() {
    document.getElementById('payment-error').style.display = 'none';
    document.getElementById('payment-form').style.display = 'block';
}