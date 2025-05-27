// Handles user rewards display and actions for the frontend
// This file loads reward points, redemption options, and reward history for users

// Rewards related functionality

// Load rewards information
async function loadRewardsInfo() {
    try {
        const response = await fetch('/api/rewards/info');
        
        if (!response.ok) {
            throw new Error('Failed to fetch rewards information');
        }
        
        const rewardsInfo = await response.json();
        displayRewardsInfo(rewardsInfo);
        
    } catch (error) {
        console.error('Error loading rewards information:', error);
        const rewardsInfoContainer = document.getElementById('rewards-info');
        if (rewardsInfoContainer) {
            rewardsInfoContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load rewards information. Please try again later.
                </div>
            `;
        }
    }
}

// Display rewards information
function displayRewardsInfo(rewardsInfo) {
    const rewardsInfoContainer = document.getElementById('rewards-info');
    if (!rewardsInfoContainer) return;
    
    rewardsInfoContainer.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">How to Earn Points</h5>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                Product Purchase
                                <span class="badge bg-primary rounded-pill">${rewardsInfo.earnRates.products} points per $1</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                Service Appointment
                                <span class="badge bg-primary rounded-pill">${rewardsInfo.earnRates.services} points per $1</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                Referral Bonus
                                <span class="badge bg-primary rounded-pill">${rewardsInfo.earnRates.referral} points</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">How to Redeem Points</h5>
                        <p class="card-text">
                            Your accumulated points can be redeemed at any of our partner shops using your 
                            MediMarket card at their point-of-sale (POS) systems.
                        </p>
                        <h6 class="mt-3">Redemption Value</h6>
                        <p class="card-text">
                            <span class="badge bg-success">${rewardsInfo.redemptionRate} points = $1</span>
                        </p>
                        <a href="/pages/rewards.html#partner-shops" class="btn btn-outline-primary mt-2">
                            View Partner Shops
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load partner shops
async function loadPartnerShops() {
    try {
        const response = await fetch('/api/rewards/partners');
        
        if (!response.ok) {
            throw new Error('Failed to fetch partner shops');
        }
        
        const partners = await response.json();
        displayPartnerShops(partners);
        
    } catch (error) {
        console.error('Error loading partner shops:', error);
        const partnerShopsContainer = document.getElementById('partner-shops');
        if (partnerShopsContainer) {
            partnerShopsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load partner shops. Please try again later.
                </div>
            `;
        }
    }
}

// Display partner shops
function displayPartnerShops(partners) {
    const partnerShopsContainer = document.getElementById('partner-shops');
    if (!partnerShopsContainer) return;
    
    if (partners.length === 0) {
        partnerShopsContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="shopping-bag"></i>
                <h4>No partner shops yet</h4>
                <p>We're working on adding partner shops to our rewards program.</p>
            </div>
        `;
        if (window.feather) {
            feather.replace();
        }
        return;
    }
    
    // Create partner shop cards
    let partnerCardsHtml = '';
    partners.forEach(partner => {
        partnerCardsHtml += `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(partner.name)}</h5>
                        <p class="card-text">${escapeHtml(partner.description)}</p>
                        <p class="card-text">
                            <small class="text-muted">
                                <i data-feather="map-pin" class="feather-sm"></i> ${escapeHtml(partner.location)}
                            </small>
                        </p>
                        <p class="mt-3">
                            <strong>Categories:</strong> ${escapeHtml(partner.categories.join(', '))}
                        </p>
                    </div>
                    <div class="card-footer bg-transparent">
                        <a href="${escapeHtml(partner.website)}" target="_blank" class="btn btn-sm btn-outline-primary">
                            Visit Website
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    
    partnerShopsContainer.innerHTML = `
        <div class="row">
            ${partnerCardsHtml}
        </div>
    `;
    
    // Initialize Feather icons
    if (window.feather) {
        feather.replace();
    }
}

// Request a rewards card
async function requestRewardsCard(event) {
    event.preventDefault();
    
    // Check if user is logged in
    const user = getUser();
    if (!user) {
        alert('Please log in to request a rewards card');
        window.location.href = '/pages/login.html?redirect=rewards.html';
        return;
    }
    
    const submitButton = document.getElementById('request-card-btn');
    setLoading(submitButton.id, true);
    
    try {
        const response = await authorizedFetch('/api/rewards/request-card', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to request rewards card');
        }
        
        const cardData = await response.json();
        displayCardRequestSuccess(cardData);
        
    } catch (error) {
        console.error('Error requesting rewards card:', error);
        showError(error.message || 'Failed to request rewards card');
    } finally {
        setLoading(submitButton.id, false);
    }
}

// Display card request success
function displayCardRequestSuccess(cardData) {
    const cardRequestForm = document.getElementById('card-request-form');
    const cardRequestSuccess = document.getElementById('card-request-success');
    
    if (cardRequestForm && cardRequestSuccess) {
        // Hide form
        cardRequestForm.style.display = 'none';
        
        // Update card details
        document.getElementById('card-number').textContent = cardData.cardNumber;
        
        // Show success message
        cardRequestSuccess.style.display = 'block';
    }
}

// Initialize rewards page
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the rewards page
    if (window.location.pathname.includes('/rewards.html')) {
        loadRewardsInfo();
        loadPartnerShops();
        
        // Load user points if logged in
        const user = getUser();
        if (user && user.type === 'patient') {
            loadPatientRewards();
        }
        
        // Add event listener for card request form
        const cardRequestForm = document.getElementById('card-request-form');
        if (cardRequestForm) {
            cardRequestForm.addEventListener('submit', requestRewardsCard);
        }
    }
});
