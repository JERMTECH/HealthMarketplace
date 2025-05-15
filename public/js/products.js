// Products related functionality

// Load available products
async function loadProducts() {
    try {
        const categoryFilter = getUrlParam('category');
        const clinicFilter = getUrlParam('clinic');
        
        let url = '/api/products';
        if (categoryFilter) {
            url += `?category=${encodeURIComponent(categoryFilter)}`;
        } else if (clinicFilter) {
            url += `?clinicId=${encodeURIComponent(clinicFilter)}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const products = await response.json();
        displayProducts(products);
        
        // Load categories for filter
        loadProductCategories();
        
    } catch (error) {
        console.error('Error loading products:', error);
        const productsContainer = document.getElementById('products-list');
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load products. Please try again later.
                </div>
            `;
        }
    }
}

// Display products
function displayProducts(products) {
    const productsContainer = document.getElementById('products-list');
    if (!productsContainer) return;
    
    // Clear container
    productsContainer.innerHTML = '';
    
    if (products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i data-feather="package"></i>
                    <h4>No products available</h4>
                    <p>We couldn't find any products matching your criteria.</p>
                    <a href="/pages/products.html" class="btn btn-primary">View All Products</a>
                </div>
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
                    <p class="card-text"><small class="text-muted">Offered by: ${escapeHtml(product.clinicName)}</small></p>
                    <div class="d-grid mt-3">
                        <button class="btn btn-primary add-to-cart-btn" data-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
    
    // Add event listeners for add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            addToCart(this.dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Load product categories for filter
async function loadProductCategories() {
    try {
        const response = await fetch('/api/products/categories');
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const categories = await response.json();
        displayProductCategories(categories);
        
    } catch (error) {
        console.error('Error loading product categories:', error);
    }
}

// Display product categories
function displayProductCategories(categories) {
    const categoriesContainer = document.getElementById('product-categories');
    if (!categoriesContainer) return;
    
    // Clear container
    categoriesContainer.innerHTML = '<li class="list-group-item"><a href="/pages/products.html" class="text-decoration-none">All Categories</a></li>';
    
    // Display categories
    categories.forEach(category => {
        const categoryItem = document.createElement('li');
        categoryItem.className = 'list-group-item';
        categoryItem.innerHTML = `
            <a href="/pages/products.html?category=${encodeURIComponent(category.name)}" class="text-decoration-none">
                ${escapeHtml(category.name)} <span class="badge bg-light text-dark">${category.count}</span>
            </a>
        `;
        categoriesContainer.appendChild(categoryItem);
    });
}

// Add product to cart
function addToCart(productId) {
    // Check if user is logged in
    const user = getUser();
    if (!user || user.type !== 'patient') {
        alert('Please log in as a patient to add products to cart');
        window.location.href = '/pages/login.html?redirect=products.html';
        return;
    }
    
    // Get cart from localStorage or initialize empty cart
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product is already in cart
    const existingProduct = cart.find(item => item.productId === productId);
    
    if (existingProduct) {
        // Increment quantity
        existingProduct.quantity += 1;
    } else {
        // Add new product to cart
        cart.push({
            productId,
            quantity: 1
        });
    }
    
    // Save updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    // Show success message
    showToast('Product added to cart');
}

// Update cart badge
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) {
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = 'inline-block';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

// Show toast message
function showToast(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">MediMarket</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${escapeHtml(message)}
        </div>
    `;
    toastContainer.appendChild(toast);
    
    // Show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

// Load cart
function loadCart() {
    try {
        // Check if user is logged in
        const user = getUser();
        if (!user || user.type !== 'patient') {
            window.location.href = '/pages/login.html?redirect=cart.html';
            return;
        }
        
        // Get cart from localStorage
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            displayEmptyCart();
            return;
        }
        
        // Load product details for cart items
        loadCartItems(cart);
        
    } catch (error) {
        console.error('Error loading cart:', error);
        showError('Failed to load cart. Please try again later.');
    }
}

// Display empty cart
function displayEmptyCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummaryContainer = document.getElementById('cart-summary');
    
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="shopping-cart"></i>
                <h4>Your cart is empty</h4>
                <p>Add products to your cart to proceed with checkout.</p>
                <a href="/pages/products.html" class="btn btn-primary">Browse Products</a>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
    }
    
    if (cartSummaryContainer) {
        cartSummaryContainer.style.display = 'none';
    }
}

// Load cart items with product details
async function loadCartItems(cart) {
    try {
        // Get product details for each cart item
        const productIds = cart.map(item => item.productId);
        const response = await fetch('/api/products/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productIds })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        
        const products = await response.json();
        
        // Create a map of product details by ID
        const productMap = {};
        products.forEach(product => {
            productMap[product.id] = product;
        });
        
        // Create cart items with product details
        const cartItems = cart.map(item => {
            const product = productMap[item.productId];
            if (!product) return null;
            
            return {
                ...item,
                product
            };
        }).filter(item => item !== null);
        
        // Group cart items by clinic
        const itemsByClinic = {};
        cartItems.forEach(item => {
            const { clinicId, clinicName } = item.product;
            if (!itemsByClinic[clinicId]) {
                itemsByClinic[clinicId] = {
                    clinicName,
                    items: []
                };
            }
            itemsByClinic[clinicId].items.push(item);
        });
        
        // Display cart items
        displayCartItems(itemsByClinic);
        
        // Calculate and display cart summary
        displayCartSummary(cartItems);
        
    } catch (error) {
        console.error('Error loading cart items:', error);
        showError('Failed to load cart items. Please try again later.');
    }
}

// Display cart items
function displayCartItems(itemsByClinic) {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;
    
    // Clear container
    cartItemsContainer.innerHTML = '';
    
    // Display cart items grouped by clinic
    Object.entries(itemsByClinic).forEach(([clinicId, clinic]) => {
        const clinicCard = document.createElement('div');
        clinicCard.className = 'card mb-4';
        
        let itemsHtml = '';
        clinic.items.forEach(item => {
            itemsHtml += `
                <div class="row cart-item mb-3" data-id="${item.productId}">
                    <div class="col-md-8">
                        <h5>${escapeHtml(item.product.name)}</h5>
                        <p class="text-muted">${escapeHtml(item.product.category || 'Uncategorized')}</p>
                        <p class="product-price">${formatCurrency(item.product.price)}</p>
                    </div>
                    <div class="col-md-4">
                        <div class="d-flex align-items-center justify-content-end">
                            <div class="input-group quantity-group" style="width: 120px;">
                                <button class="btn btn-outline-secondary decrease-quantity" type="button">-</button>
                                <input type="number" class="form-control text-center item-quantity" value="${item.quantity}" min="1" max="99">
                                <button class="btn btn-outline-secondary increase-quantity" type="button">+</button>
                            </div>
                            <button class="btn btn-link text-danger remove-item-btn ms-2">
                                <i data-feather="trash-2"></i>
                            </button>
                        </div>
                        <div class="text-end mt-2">
                            <span class="item-total">${formatCurrency(item.product.price * item.quantity)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        clinicCard.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">${escapeHtml(clinic.clinicName)}</h5>
            </div>
            <div class="card-body">
                ${itemsHtml}
            </div>
        `;
        
        cartItemsContainer.appendChild(clinicCard);
    });
    
    // Add event listeners for quantity buttons and remove buttons
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.item-quantity');
            if (input.value > 1) {
                input.value = parseInt(input.value) - 1;
                updateCartItemQuantity(this.closest('.cart-item').dataset.id, parseInt(input.value));
            }
        });
    });
    
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.item-quantity');
            if (input.value < 99) {
                input.value = parseInt(input.value) + 1;
                updateCartItemQuantity(this.closest('.cart-item').dataset.id, parseInt(input.value));
            }
        });
    });
    
    document.querySelectorAll('.item-quantity').forEach(input => {
        input.addEventListener('change', function() {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 99) value = 99;
            this.value = value;
            updateCartItemQuantity(this.closest('.cart-item').dataset.id, value);
        });
    });
    
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            removeCartItem(this.closest('.cart-item').dataset.id);
        });
    });
    
    // Re-initialize Feather icons for dynamically added content
    if (window.feather) {
        feather.replace();
    }
}

// Display cart summary
function displayCartSummary(cartItems) {
    const cartSummaryContainer = document.getElementById('cart-summary');
    if (!cartSummaryContainer) return;
    
    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Calculate estimated points
    const estimatedPoints = Math.floor(subtotal * 10); // 10 points per dollar
    
    // Update summary values
    document.getElementById('cart-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('cart-total').textContent = formatCurrency(subtotal);
    document.getElementById('estimated-points').textContent = estimatedPoints;
    
    // Show summary container
    cartSummaryContainer.style.display = 'block';
}

// Update cart item quantity
function updateCartItemQuantity(productId, quantity) {
    // Get cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Find the item in the cart
    const itemIndex = cart.findIndex(item => item.productId === productId);
    
    if (itemIndex !== -1) {
        // Update quantity
        cart[itemIndex].quantity = quantity;
        
        // Save updated cart to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update the item total price
        const priceElement = document.querySelector(`.cart-item[data-id="${productId}"] .product-price`);
        const totalElement = document.querySelector(`.cart-item[data-id="${productId}"] .item-total`);
        
        if (priceElement && totalElement) {
            const price = parseFloat(priceElement.textContent.replace(/[^0-9.-]+/g, ''));
            totalElement.textContent = formatCurrency(price * quantity);
        }
        
        // Recalculate summary
        recalculateCartSummary();
        
        // Update cart badge
        updateCartBadge();
    }
}

// Remove cart item
function removeCartItem(productId) {
    // Get cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Remove the item from the cart
    cart = cart.filter(item => item.productId !== productId);
    
    // Save updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart badge
    updateCartBadge();
    
    // Check if cart is empty
    if (cart.length === 0) {
        displayEmptyCart();
        return;
    }
    
    // Remove the item from the DOM
    const itemElement = document.querySelector(`.cart-item[data-id="${productId}"]`);
    if (itemElement) {
        const parentCard = itemElement.closest('.card');
        itemElement.remove();
        
        // If no more items in the clinic card, remove the card
        if (parentCard && parentCard.querySelectorAll('.cart-item').length === 0) {
            parentCard.remove();
        }
    }
    
    // Recalculate summary
    recalculateCartSummary();
}

// Recalculate cart summary
function recalculateCartSummary() {
    const totalElements = document.querySelectorAll('.item-total');
    let subtotal = 0;
    
    totalElements.forEach(el => {
        subtotal += parseFloat(el.textContent.replace(/[^0-9.-]+/g, ''));
    });
    
    // Update summary values
    document.getElementById('cart-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('cart-total').textContent = formatCurrency(subtotal);
    document.getElementById('estimated-points').textContent = Math.floor(subtotal * 10);
}

// Checkout process
async function checkout() {
    // Check if user is logged in
    const user = getUser();
    if (!user || user.type !== 'patient') {
        alert('Please log in as a patient to checkout');
        window.location.href = '/pages/login.html?redirect=cart.html';
        return;
    }
    
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        showError('Your cart is empty');
        return;
    }
    
    const checkoutBtn = document.getElementById('checkout-btn');
    setLoading(checkoutBtn.id, true);
    
    try {
        // Prepare order data
        const orderData = {
            patientId: user.id,
            items: cart
        };
        
        const response = await authorizedFetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to place order');
        }
        
        const orderResult = await response.json();
        
        // Clear cart
        localStorage.removeItem('cart');
        
        // Update cart badge
        updateCartBadge();
        
        // Show checkout success
        showCheckoutSuccess(orderResult);
        
    } catch (error) {
        console.error('Error during checkout:', error);
        showError(error.message || 'Failed to place order');
    } finally {
        setLoading(checkoutBtn.id, false);
    }
}

// Show checkout success
function showCheckoutSuccess(order) {
    const cartContainer = document.getElementById('cart-container');
    const successContainer = document.getElementById('checkout-success');
    
    if (cartContainer && successContainer) {
        // Hide cart container
        cartContainer.style.display = 'none';
        
        // Update order details in success message
        document.getElementById('order-number').textContent = order.id.substring(0, 8);
        document.getElementById('order-points').textContent = order.pointsEarned;
        document.getElementById('order-total').textContent = formatCurrency(order.total);
        
        // Show success container
        successContainer.style.display = 'block';
    }
}

// Return to shopping
function returnToShopping() {
    window.location.href = '/pages/products.html';
}

// View orders
function viewOrders() {
    window.location.href = '/pages/patient-dashboard.html#orders';
}

// Initialize products page
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the products page
    if (window.location.pathname.includes('/products.html')) {
        loadProducts();
        
        // Update cart badge
        updateCartBadge();
    }
    
    // Check if we're on the cart page
    if (window.location.pathname.includes('/cart.html')) {
        loadCart();
        
        // Add event listener for checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', checkout);
        }
        
        // Add event listeners for success buttons
        const continueShoppingBtn = document.getElementById('continue-shopping-btn');
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', returnToShopping);
        }
        
        const viewOrdersBtn = document.getElementById('view-orders-btn');
        if (viewOrdersBtn) {
            viewOrdersBtn.addEventListener('click', viewOrders);
        }
    }
    
    // Add cart link to navbar
    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav) {
        const cartLink = document.createElement('li');
        cartLink.className = 'nav-item';
        cartLink.innerHTML = `
            <a class="nav-link" href="/pages/cart.html">
                <i data-feather="shopping-cart"></i>
                <span id="cart-badge" class="badge bg-danger" style="display: none;"></span>
            </a>
        `;
        navbarNav.querySelector('ul').appendChild(cartLink);
        
        // Update cart badge
        updateCartBadge();
        
        // Re-initialize Feather icons
        if (window.feather) {
            feather.replace();
        }
    }
});
