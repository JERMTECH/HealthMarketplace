document.addEventListener('DOMContentLoaded', function() {
    // Initialize feather icons
    feather.replace();
    
    // Check if user is logged in and is an admin
    checkAdminAccess();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load data
    loadRewardConfigurations();
    loadSeasons();
    loadProducts();
});

// Check if user has admin access
function checkAdminAccess() {
    const user = getUser();
    // More permissive check for admin types
    const adminTypes = ['admin', 'administrator', 'system'];
    if (!user || !adminTypes.includes(user.type)) {
        console.log("User type:", user ? user.type : "not logged in");
        window.location.href = '/pages/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
    }
}

// Set up event listeners
function setupEventListeners() {
    // New configuration button
    document.getElementById('new-config-btn').addEventListener('click', function() {
        document.getElementById('config-form').reset();
        document.getElementById('config-id').value = '';
        document.getElementById('config-modal-title').textContent = 'New Reward Configuration';
        
        // Clear category rules except for the first two default ones
        const categoryRules = document.getElementById('category-rules');
        while (categoryRules.children.length > 2) {
            categoryRules.removeChild(categoryRules.lastChild);
        }
        
        // Reset the first two default category rules
        const rules = categoryRules.children;
        if (rules.length > 0) {
            rules[0].querySelector('input:first-child').value = 'Prescription';
            rules[0].querySelector('input:nth-child(2)').value = '1.0';
        }
        if (rules.length > 1) {
            rules[1].querySelector('input:first-child').value = 'OTC';
            rules[1].querySelector('input:nth-child(2)').value = '1.5';
        }
        
        const configModal = new bootstrap.Modal(document.getElementById('config-modal'));
        configModal.show();
    });
    
    // New season button
    document.getElementById('new-season-btn').addEventListener('click', function() {
        document.getElementById('season-form').reset();
        document.getElementById('season-id').value = '';
        document.getElementById('season-modal-title').textContent = 'New Seasonal Promotion';
        
        // Set default dates (today and 3 months from today)
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(today.getMonth() + 3);
        
        document.getElementById('start-date').value = formatDateForInput(today);
        document.getElementById('end-date').value = formatDateForInput(threeMonthsLater);
        
        const seasonModal = new bootstrap.Modal(document.getElementById('season-modal'));
        seasonModal.show();
    });
    
    // Add category rule button
    document.getElementById('add-category-rule').addEventListener('click', function() {
        addCategoryRule();
    });
    
    // Remove rule buttons (use event delegation)
    document.getElementById('category-rules').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-rule') || e.target.parentElement.classList.contains('remove-rule')) {
            const button = e.target.classList.contains('remove-rule') ? e.target : e.target.parentElement;
            const rule = button.closest('.category-rule');
            rule.remove();
        }
    });
    
    // Save configuration button
    document.getElementById('save-config-btn').addEventListener('click', function() {
        saveRewardConfiguration();
    });
    
    // Save season button
    document.getElementById('save-season-btn').addEventListener('click', function() {
        saveSeason();
    });
    
    // Calculator form
    document.getElementById('calculator-form').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateRewards();
    });
    
    // Refresh feather icons when tabs are shown
    const rewardsTab = document.getElementById('rewardsTab');
    rewardsTab.addEventListener('shown.bs.tab', function() {
        feather.replace();
    });
}

// Format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Add a new category rule field
function addCategoryRule() {
    const categoryRules = document.getElementById('category-rules');
    
    const rule = document.createElement('div');
    rule.className = 'category-rule';
    
    rule.innerHTML = `
        <input type="text" class="form-control" placeholder="Category name">
        <input type="number" class="form-control" placeholder="Multiplier" value="1.0" min="0.1" step="0.1">
        <button type="button" class="btn btn-outline-danger remove-rule"><i data-feather="x"></i></button>
    `;
    
    categoryRules.appendChild(rule);
    feather.replace();
}

// Load reward configurations
function loadRewardConfigurations() {
    const tableBody = document.getElementById('config-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading configurations...</td></tr>';
    
    fetch('/api/rewards/config/configurations')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load configurations');
            }
            return response.json();
        })
        .then(configs => {
            if (configs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No configurations found. Create your first one!</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            configs.forEach(config => {
                let categoryRules = '';
                try {
                    const rules = JSON.parse(config.product_category_rules);
                    for (const [category, multiplier] of Object.entries(rules)) {
                        categoryRules += `<span class="badge bg-light text-dark me-1 mb-1">${category}: ${multiplier}x</span>`;
                    }
                } catch (e) {
                    categoryRules = '<span class="text-muted">None</span>';
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="fw-bold">${config.name}</div>
                        <div class="small text-muted">${config.description || ''}</div>
                    </td>
                    <td>${config.base_rate} points/$</td>
                    <td>${categoryRules}</td>
                    <td>
                        <span class="badge ${config.is_active ? 'active-badge' : 'inactive-badge'}">
                            ${config.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary edit-config" data-id="${config.id}">
                                <i data-feather="edit" class="feather-sm"></i> Edit
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-config" data-id="${config.id}">
                                <i data-feather="trash-2" class="feather-sm"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-config').forEach(button => {
                button.addEventListener('click', function() {
                    const configId = this.getAttribute('data-id');
                    editRewardConfiguration(configId);
                });
            });
            
            document.querySelectorAll('.delete-config').forEach(button => {
                button.addEventListener('click', function() {
                    const configId = this.getAttribute('data-id');
                    deleteRewardConfiguration(configId);
                });
            });
            
            feather.replace();
        })
        .catch(error => {
            console.error('Error loading configurations:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-danger">
                        Error loading configurations. Please try again.
                    </td>
                </tr>
            `;
        });
}

// Load seasons
function loadSeasons() {
    const tableBody = document.getElementById('season-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading seasons...</td></tr>';
    
    fetch('/api/rewards/config/seasons')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load seasons');
            }
            return response.json();
        })
        .then(seasons => {
            if (seasons.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No seasons found. Create your first one!</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            seasons.forEach(season => {
                // Format dates for display
                const startDate = new Date(season.start_date).toLocaleDateString();
                const endDate = new Date(season.end_date).toLocaleDateString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="fw-bold">${season.name}</div>
                        <div class="small text-muted">${season.description || ''}</div>
                    </td>
                    <td>${startDate} to ${endDate}</td>
                    <td>${season.multiplier}x</td>
                    <td>
                        <span class="badge ${season.is_active ? 'active-badge' : 'inactive-badge'}">
                            ${season.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary edit-season" data-id="${season.id}">
                                <i data-feather="edit" class="feather-sm"></i> Edit
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-season" data-id="${season.id}">
                                <i data-feather="trash-2" class="feather-sm"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-season').forEach(button => {
                button.addEventListener('click', function() {
                    const seasonId = this.getAttribute('data-id');
                    editSeason(seasonId);
                });
            });
            
            document.querySelectorAll('.delete-season').forEach(button => {
                button.addEventListener('click', function() {
                    const seasonId = this.getAttribute('data-id');
                    deleteSeason(seasonId);
                });
            });
            
            feather.replace();
        })
        .catch(error => {
            console.error('Error loading seasons:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-danger">
                        Error loading seasons. Please try again.
                    </td>
                </tr>
            `;
        });
}

// Load products for simulator
function loadProducts() {
    const dropdown = document.getElementById('product-dropdown');
    
    fetch('/api/products/all')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            return response.json();
        })
        .then(products => {
            // Clear existing options except the first one
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Add products to dropdown
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - $${product.price}`;
                option.setAttribute('data-price', product.price);
                option.setAttribute('data-category', product.category || '');
                dropdown.appendChild(option);
            });
            
            // Add event listener to update price and category when product is selected
            dropdown.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption.value) {
                    document.getElementById('price-input').value = selectedOption.getAttribute('data-price');
                    const category = selectedOption.getAttribute('data-category');
                    if (category) {
                        const categoryDropdown = document.getElementById('category-dropdown');
                        for (let i = 0; i < categoryDropdown.options.length; i++) {
                            if (categoryDropdown.options[i].value === category) {
                                categoryDropdown.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading products:', error);
            dropdown.innerHTML = '<option value="">Failed to load products</option>';
        });
}

// Edit reward configuration
function editRewardConfiguration(configId) {
    fetch(`/api/rewards/config/configurations/${configId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }
            return response.json();
        })
        .then(config => {
            document.getElementById('config-id').value = config.id;
            document.getElementById('config-name').value = config.name;
            document.getElementById('config-description').value = config.description || '';
            document.getElementById('base-rate').value = config.base_rate;
            document.getElementById('is-active-config').checked = config.is_active;
            
            // Parse and set category rules
            const categoryRules = document.getElementById('category-rules');
            categoryRules.innerHTML = ''; // Clear existing rules
            
            try {
                const rules = JSON.parse(config.product_category_rules);
                for (const [category, multiplier] of Object.entries(rules)) {
                    const rule = document.createElement('div');
                    rule.className = 'category-rule';
                    
                    rule.innerHTML = `
                        <input type="text" class="form-control" placeholder="Category name" value="${category}">
                        <input type="number" class="form-control" placeholder="Multiplier" value="${multiplier}" min="0.1" step="0.1">
                        <button type="button" class="btn btn-outline-danger remove-rule"><i data-feather="x"></i></button>
                    `;
                    
                    categoryRules.appendChild(rule);
                }
                
                // Add at least one rule if none exist
                if (Object.keys(rules).length === 0) {
                    addCategoryRule();
                }
            } catch (e) {
                console.error('Error parsing category rules:', e);
                // Add default rules
                addCategoryRule();
                addCategoryRule();
            }
            
            document.getElementById('config-modal-title').textContent = 'Edit Reward Configuration';
            const configModal = new bootstrap.Modal(document.getElementById('config-modal'));
            configModal.show();
            
            feather.replace();
        })
        .catch(error => {
            console.error('Error loading configuration:', error);
            alert('Failed to load configuration. Please try again.');
        });
}

// Save reward configuration
function saveRewardConfiguration() {
    const configId = document.getElementById('config-id').value;
    const name = document.getElementById('config-name').value;
    const description = document.getElementById('config-description').value;
    const baseRate = document.getElementById('base-rate').value;
    const isActive = document.getElementById('is-active-config').checked;
    
    // Validate form
    if (!name) {
        alert('Please enter a configuration name.');
        return;
    }
    
    if (!baseRate || parseFloat(baseRate) <= 0) {
        alert('Please enter a valid base rate greater than zero.');
        return;
    }
    
    // Collect category rules
    const categoryRules = {};
    document.querySelectorAll('.category-rule').forEach(rule => {
        const category = rule.querySelector('input:first-child').value.trim();
        const multiplier = rule.querySelector('input:nth-child(2)').value;
        
        if (category && multiplier) {
            categoryRules[category] = multiplier;
        }
    });
    
    const configData = {
        name,
        description,
        is_active: isActive,
        base_rate: baseRate,
        product_category_rules: JSON.stringify(categoryRules)
    };
    
    const url = configId ? 
        `/api/rewards/config/configurations/${configId}` : 
        '/api/rewards/config/configurations';
    
    const method = configId ? 'PUT' : 'POST';
    
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }
            return response.json();
        })
        .then(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('config-modal'));
            modal.hide();
            
            loadRewardConfigurations();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success alert-dismissible fade show';
            successMessage.setAttribute('role', 'alert');
            successMessage.innerHTML = `
                <i data-feather="check-circle" class="feather-sm me-2"></i>
                Configuration saved successfully.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const tabContent = document.getElementById('configurations');
            tabContent.insertBefore(successMessage, tabContent.firstChild);
            
            feather.replace();
            
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                const alert = bootstrap.Alert.getOrCreateInstance(successMessage);
                alert.close();
            }, 3000);
        })
        .catch(error => {
            console.error('Error saving configuration:', error);
            alert('Failed to save configuration. Please try again.');
        });
}

// Delete reward configuration
function deleteRewardConfiguration(configId) {
    if (confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) {
        fetch(`/api/rewards/config/configurations/${configId}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete configuration');
                }
                loadRewardConfigurations();
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'alert alert-success alert-dismissible fade show';
                successMessage.setAttribute('role', 'alert');
                successMessage.innerHTML = `
                    <i data-feather="check-circle" class="feather-sm me-2"></i>
                    Configuration deleted successfully.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                
                const tabContent = document.getElementById('configurations');
                tabContent.insertBefore(successMessage, tabContent.firstChild);
                
                feather.replace();
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    const alert = bootstrap.Alert.getOrCreateInstance(successMessage);
                    alert.close();
                }, 3000);
            })
            .catch(error => {
                console.error('Error deleting configuration:', error);
                alert('Failed to delete configuration. Please try again.');
            });
    }
}

// Edit season
function editSeason(seasonId) {
    fetch(`/api/rewards/config/seasons/${seasonId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load season');
            }
            return response.json();
        })
        .then(season => {
            document.getElementById('season-id').value = season.id;
            document.getElementById('season-name').value = season.name;
            document.getElementById('season-description').value = season.description || '';
            document.getElementById('start-date').value = season.start_date;
            document.getElementById('end-date').value = season.end_date;
            document.getElementById('multiplier').value = season.multiplier;
            document.getElementById('is-active-season').checked = season.is_active;
            
            document.getElementById('season-modal-title').textContent = 'Edit Seasonal Promotion';
            const seasonModal = new bootstrap.Modal(document.getElementById('season-modal'));
            seasonModal.show();
        })
        .catch(error => {
            console.error('Error loading season:', error);
            alert('Failed to load season. Please try again.');
        });
}

// Save season
function saveSeason() {
    const seasonId = document.getElementById('season-id').value;
    const name = document.getElementById('season-name').value;
    const description = document.getElementById('season-description').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const multiplier = document.getElementById('multiplier').value;
    const isActive = document.getElementById('is-active-season').checked;
    
    // Validate form
    if (!name) {
        alert('Please enter a season name.');
        return;
    }
    
    if (!startDate || !endDate) {
        alert('Please enter start and end dates.');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date must be before end date.');
        return;
    }
    
    if (!multiplier || parseFloat(multiplier) <= 0) {
        alert('Please enter a valid multiplier greater than zero.');
        return;
    }
    
    const seasonData = {
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        multiplier,
        is_active: isActive
    };
    
    const url = seasonId ? 
        `/api/rewards/config/seasons/${seasonId}` : 
        '/api/rewards/config/seasons';
    
    const method = seasonId ? 'PUT' : 'POST';
    
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(seasonData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save season');
            }
            return response.json();
        })
        .then(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('season-modal'));
            modal.hide();
            
            loadSeasons();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success alert-dismissible fade show';
            successMessage.setAttribute('role', 'alert');
            successMessage.innerHTML = `
                <i data-feather="check-circle" class="feather-sm me-2"></i>
                Season saved successfully.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const tabContent = document.getElementById('seasons');
            tabContent.insertBefore(successMessage, tabContent.firstChild);
            
            feather.replace();
            
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                const alert = bootstrap.Alert.getOrCreateInstance(successMessage);
                alert.close();
            }, 3000);
        })
        .catch(error => {
            console.error('Error saving season:', error);
            alert('Failed to save season. Please try again.');
        });
}

// Delete season
function deleteSeason(seasonId) {
    if (confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
        fetch(`/api/rewards/config/seasons/${seasonId}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete season');
                }
                loadSeasons();
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'alert alert-success alert-dismissible fade show';
                successMessage.setAttribute('role', 'alert');
                successMessage.innerHTML = `
                    <i data-feather="check-circle" class="feather-sm me-2"></i>
                    Season deleted successfully.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                
                const tabContent = document.getElementById('seasons');
                tabContent.insertBefore(successMessage, tabContent.firstChild);
                
                feather.replace();
                
                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    const alert = bootstrap.Alert.getOrCreateInstance(successMessage);
                    alert.close();
                }, 3000);
            })
            .catch(error => {
                console.error('Error deleting season:', error);
                alert('Failed to delete season. Please try again.');
            });
    }
}

// Calculate rewards
function calculateRewards() {
    const productId = document.getElementById('product-dropdown').value;
    const price = parseFloat(document.getElementById('price-input').value);
    const quantity = parseInt(document.getElementById('quantity-input').value);
    const category = document.getElementById('category-dropdown').value;
    
    // Validate inputs
    if (!price || price <= 0) {
        alert('Please enter a valid price greater than zero.');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity greater than zero.');
        return;
    }
    
    const calculationData = {
        product_id: productId,
        price,
        quantity,
        category: category || null
    };
    
    fetch('/api/rewards/config/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(calculationData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to calculate rewards');
            }
            return response.json();
        })
        .then(result => {
            const breakdown = result.calculation_breakdown;
            const resultsContainer = document.getElementById('calculation-results');
            
            resultsContainer.innerHTML = `
                <div class="text-center mb-4">
                    <div class="display-4 text-primary fw-bold">${result.points}</div>
                    <div class="text-muted">points</div>
                </div>
                
                <div class="card border-0 bg-light">
                    <div class="card-body">
                        <h5 class="card-title">Calculation Breakdown</h5>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Base Rate
                                <span>${breakdown.base_rate} points per $</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Price
                                <span>$${breakdown.price.toFixed(2)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Base Points
                                <span>${breakdown.base_points.toFixed(1)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Season
                                <span>${breakdown.season}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Seasonal Multiplier
                                <span>×${result.seasonal_multiplier.toFixed(1)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Category
                                <span>${breakdown.category}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Category Multiplier
                                <span>×${result.category_multiplier.toFixed(1)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                                Quantity
                                <span>×${breakdown.quantity}</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="mt-3">
                    <div class="alert alert-secondary">
                        <strong>Formula:</strong> ${breakdown.calculation}
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error calculating rewards:', error);
            
            const resultsContainer = document.getElementById('calculation-results');
            resultsContainer.innerHTML = `
                <div class="text-center py-4 text-danger">
                    <i data-feather="alert-circle" style="width: 3rem; height: 3rem;"></i>
                    <h5 class="mt-3">Error calculating rewards</h5>
                    <p>Please try again with different values.</p>
                </div>
            `;
            
            feather.replace();
        });
}