// Manages the shopping cart for the frontend
// Adds/removes products, updates cart UI, handles checkout logic

// Load cart contents
function loadCartContents() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartContentsElement = document.getElementById('cart-contents');
    const cartEmptyMessage = document.getElementById('cart-empty-message');
    const cartActions = document.getElementById('cart-actions');
    
    if (cart.length === 0) {
        // Show empty cart message
        cartEmptyMessage.style.display = 'block';
        cartContentsElement.innerHTML = '';
        cartActions.style.display = 'none';
        return;
    }
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Show cart table
    let cartHTML = `
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>Product</th>
                        <th style="width: 150px;">Quantity</th>
                        <th style="width: 150px;">Price</th>
                        <th style="width: 150px;">Total</th>
                        <th style="width: 100px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    cart.forEach((item, index) => {
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        cartHTML += `
            <tr>
                <td>
                    <strong>${item.name}</strong>
                </td>
                <td>
                    <div class="input-group">
                        <button class="btn btn-outline-secondary decrease-qty" type="button" data-index="${index}">-</button>
                        <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                        <button class="btn btn-outline-secondary increase-qty" type="button" data-index="${index}">+</button>
                    </div>
                </td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td>$${itemTotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">
                        <i data-feather="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    cartHTML += `
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-end">Subtotal:</th>
                        <th>$${total.toFixed(2)}</th>
                        <th></th>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    cartContentsElement.innerHTML = cartHTML;
    cartEmptyMessage.style.display = 'none';
    cartActions.style.display = 'flex';
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Set up event listeners
    setupCartEventListeners();
}

// Set up cart event listeners
function setupCartEventListeners() {
    // Remove item buttons
    const removeItemButtons = document.querySelectorAll('.remove-item');
    removeItemButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeCartItem(index);
        });
    });
    
    // Quantity adjustment buttons
    const decreaseButtons = document.querySelectorAll('.decrease-qty');
    const increaseButtons = document.querySelectorAll('.increase-qty');
    
    decreaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateCartItemQuantity(index, -1);
        });
    });
    
    increaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateCartItemQuantity(index, 1);
        });
    });
    
    // Clear cart button
    const clearCartButton = document.getElementById('clear-cart-btn');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }
    
    // Checkout button
    const checkoutButton = document.getElementById('checkout-btn');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', proceedToCheckout);
    }
}

// Remove item from cart
function removeCartItem(index) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Remove the item
    cart.splice(index, 1);
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Reload cart contents
    loadCartContents();
}

// Update cart item quantity
function updateCartItemQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Update quantity
    cart[index].quantity = Math.max(1, parseInt(cart[index].quantity) + change);
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Reload cart contents
    loadCartContents();
}

// Clear cart
function clearCart() {
    if (confirm('Are you sure you want to clear your shopping cart?')) {
        localStorage.setItem('cart', JSON.stringify([]));
        loadCartContents();
    }
}

// Proceed to checkout
function proceedToCheckout() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (!token) {
        // If not logged in, redirect to login page with return URL
        const returnUrl = encodeURIComponent('/pages/cart.html');
        window.location.href = `/pages/login.html?returnUrl=${returnUrl}`;
        return;
    }
    
    // Get cart items
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Show loading message
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }
    
    // Redirect to payment page instead of directly submitting the order
    // The payment page will handle the payment process and order submission
    window.location.href = '/pages/payment.html';
}