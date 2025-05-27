// Controls the cart button UI for the frontend
// Updates the cart icon/badge with the number of items, provides quick access to the cart

// This script creates a fixed cart button that will be visible on all pages
document.addEventListener('DOMContentLoaded', function() {
    // Create the cart button
    const cartButton = document.createElement('a');
    cartButton.href = '/pages/cart.html';
    cartButton.classList.add('cart-button-floating');
    cartButton.innerHTML = `
        <div class="cart-icon">🛒</div>
        <div class="cart-text">CART</div>
        <div class="cart-count" id="floating-cart-count">0</div>
    `;
    
    // Add the button to the body
    document.body.appendChild(cartButton);
    
    // Update cart count
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemCount = cartItems.reduce((total, item) => total + parseInt(item.quantity || 1), 0);
    
    document.getElementById('floating-cart-count').textContent = itemCount;
});