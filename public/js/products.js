// Products functionality

document.addEventListener('DOMContentLoaded', function() {
    // Load products on products page
    if (document.getElementById('products-list')) {
        loadProducts();
    }
    
    // Load product categories
    if (document.getElementById('product-categories')) {
        loadProductCategories();
    }
    
    // Initialize shopping cart
    initializeShoppingCart();
    
    // Set up category filter click handlers
    setupCategoryFilters();
});

// Load all products (with optional category filter)
function loadProducts(category = null) {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch products (with category filter if provided)
    let url = '/api/products/all';
    if (category) {
        url += `?category=${encodeURIComponent(category)}`;
    }
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(products => {
            if (products.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">No products available${category ? ' in this category' : ''}.</p>
                    </div>
                `;
                return;
            }
            
            // Clear the container
            container.innerHTML = '';
            
            // Display each product
            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        ${product.image_url ? 
                            `<img src="${product.image_url}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">` : 
                            `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                <i data-feather="package" style="width: 48px; height: 48px; color: #ccc;"></i>
                            </div>`
                        }
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.description || 'No description available'}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-primary">$${parseFloat(product.price).toFixed(2)}</span>
                                <button class="btn btn-outline-primary add-to-cart-btn" 
                                    data-id="${product.id}" 
                                    data-name="${product.name}" 
                                    data-price="${product.price}"
                                    ${product.in_stock ? '' : 'disabled'}>
                                    ${product.in_stock ? 'Add to Cart' : 'Out of Stock'}
                                </button>
                            </div>
                            ${product.clinic ? 
                                `<p class="card-text mt-2">
                                    <small class="text-muted">Sold by: 
                                        <a href="clinic-details.html?id=${product.clinic.id}">${product.clinic.name}</a>
                                    </small>
                                </p>` : ''
                            }
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            
            // Set up "Add to Cart" buttons
            setupAddToCartButtons();
            
            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-danger">Failed to load products. Please try again later.</p>
                    <button class="btn btn-outline-primary" onclick="loadProducts(${category ? `'${category}'` : ''})">Try Again</button>
                </div>
            `;
        });
}

// Load product categories
function loadProductCategories() {
    const container = document.getElementById('product-categories');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="spinner-border text-primary spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    
    // Fetch product categories
    fetch('/api/products/categories')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(categories => {
            // Always include "All" category
            let categoryHTML = `
                <a href="#" class="list-group-item list-group-item-action active" data-category="">
                    All Products
                </a>
            `;
            
            // Add each category
            categories.forEach(category => {
                categoryHTML += `
                    <a href="#" class="list-group-item list-group-item-action" data-category="${category.name}">
                        ${category.name} <span class="badge bg-secondary float-end">${category.count}</span>
                    </a>
                `;
            });
            
            container.innerHTML = categoryHTML;
            
            // Set up category filter click handlers
            setupCategoryFilters();
        })
        .catch(error => {
            console.error('Error loading product categories:', error);
            container.innerHTML = `
                <div class="text-danger">Failed to load categories</div>
            `;
        });
}

// Set up category filter click handlers
function setupCategoryFilters() {
    const categoryLinks = document.querySelectorAll('#product-categories a');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            categoryLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Get the category and load products
            const category = this.getAttribute('data-category');
            loadProducts(category);
        });
    });
}

// Initialize shopping cart
function initializeShoppingCart() {
    // Create cart if it doesn't exist
    if (!localStorage.getItem('cart')) {
        localStorage.setItem('cart', JSON.stringify([]));
    }
    
    // Update cart badge
    updateCartBadge();
    
    // Set up cart button click handler
    document.addEventListener('DOMContentLoaded', function() {
        const viewCartBtn = document.getElementById('view-cart-btn');
        if (viewCartBtn) {
            viewCartBtn.addEventListener('click', function() {
                showCart();
            });
        }
    });
}

// Update cart badge with item count
function updateCartBadge() {
    const cartBadge = document.getElementById('cart-badge');
    const cartCount = document.getElementById('cart-count');
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemCount = cart.reduce((total, item) => total + parseInt(item.quantity), 0);
    
    // Update both cart indicators if they exist
    if (cartBadge) {
        cartBadge.textContent = itemCount;
        cartBadge.style.display = itemCount > 0 ? 'inline-block' : 'none';
    }
    
    if (cartCount) {
        cartCount.textContent = itemCount;
    }
}

// Set up "Add to Cart" buttons
function setupAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');
            
            addToCart(productId, productName, productPrice);
            
            // Show feedback
            this.textContent = 'Added!';
            setTimeout(() => {
                this.textContent = 'Add to Cart';
            }, 1500);
        });
    });
}

// Add item to cart
function addToCart(productId, productName, productPrice, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex >= 0) {
        // Update quantity
        cart[existingItemIndex].quantity += parseInt(quantity);
    } else {
        // Add new item
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: parseInt(quantity)
        });
    }
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
}

// Show cart
function showCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Create cart modal if it doesn't exist
    let cartModal = document.getElementById('cart-modal');
    
    if (!cartModal) {
        cartModal = document.createElement('div');
        cartModal.id = 'cart-modal';
        cartModal.className = 'modal fade';
        cartModal.tabIndex = '-1';
        cartModal.setAttribute('aria-labelledby', 'cart-modal-label');
        cartModal.setAttribute('aria-hidden', 'true');
        
        cartModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cart-modal-label">Shopping Cart</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="cart-modal-body">
                        <!-- Cart items will go here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="checkout-btn">Checkout</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(cartModal);
        
        // Initialize Bootstrap modal
        cartModal = new bootstrap.Modal(cartModal);
    }
    
    // Update cart items
    const cartModalBody = document.getElementById('cart-modal-body');
    
    let cartHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;
    
    cart.forEach((item, index) => {
        cartHTML += `
            <tr>
                <td>${item.name}</td>
                <td>
                    <div class="input-group input-group-sm" style="width: 100px;">
                        <button class="btn btn-outline-secondary decrease-qty" type="button" data-index="${index}">-</button>
                        <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                        <button class="btn btn-outline-secondary increase-qty" type="button" data-index="${index}">+</button>
                    </div>
                </td>
                <td>$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger remove-item" data-index="${index}">
                        <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    cartHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="2">Total:</th>
                    <th>$${total.toFixed(2)}</th>
                    <th></th>
                </tr>
            </tfoot>
        </table>
    `;
    
    cartModalBody.innerHTML = cartHTML;
    
    // Set up event listeners for cart operations
    setupCartEventListeners();
    
    // Re-initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Show the modal
    cartModal.show();
}

// Set up event listeners for cart operations
function setupCartEventListeners() {
    // Increase quantity
    document.querySelectorAll('.increase-qty').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateCartItemQuantity(index, 1);
        });
    });
    
    // Decrease quantity
    document.querySelectorAll('.decrease-qty').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateCartItemQuantity(index, -1);
        });
    });
    
    // Remove item
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeCartItem(index);
        });
    });
    
    // Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
    }
}

// Update cart item quantity
function updateCartItemQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Update quantity (minimum 1)
    cart[index].quantity = Math.max(1, parseInt(cart[index].quantity) + change);
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    // Re-render cart
    showCart();
}

// Remove item from cart
function removeCartItem(index) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Remove the item
    cart.splice(index, 1);
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    if (cart.length === 0) {
        // Hide modal if cart is empty
        const cartModal = bootstrap.Modal.getInstance(document.getElementById('cart-modal'));
        if (cartModal) {
            cartModal.hide();
        }
    } else {
        // Re-render cart
        showCart();
    }
}

// Proceed to checkout
function proceedToCheckout() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (!token) {
        // If not logged in, redirect to login page with return URL
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?returnUrl=${returnUrl}`;
        return;
    }
    
    // Get cart items
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Prepare order data
    const orderItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
    }));
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Get current user
    const user = getUser();
    if (!user || user.type !== 'patient') {
        alert('You must be logged in as a patient to place an order');
        return;
    }
    
    const orderData = {
        patient_id: user.id,
        items: orderItems,
        total: total.toString()
    };
    
    // Create order
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
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(order => {
        // Clear cart
        localStorage.setItem('cart', JSON.stringify([]));
        
        // Update cart badge
        updateCartBadge();
        
        // Hide modal
        const cartModal = bootstrap.Modal.getInstance(document.getElementById('cart-modal'));
        if (cartModal) {
            cartModal.hide();
        }
        
        // Show success message
        alert(`Order placed successfully! Order ID: ${order.id}`);
        
        // Redirect to order confirmation page (if exists)
        // window.location.href = `order-confirmation.html?id=${order.id}`;
    })
    .catch(error => {
        console.error('Error creating order:', error);
        alert('Failed to place order. Please try again later.');
    });
}