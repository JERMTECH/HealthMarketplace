const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');
const { addRewardPoints } = require('./rewards');

// Get all products
const getProducts = () => {
  return db.products;
};

// Get product by ID
const getProductById = (id) => {
  return db.products.find(product => product.id === id);
};

// Get products by array of IDs
const getProductsByIds = (ids) => {
  return db.products.filter(product => ids.includes(product.id));
};

// Get products by clinic ID
const getClinicProducts = (clinicId) => {
  return db.products.filter(product => product.clinicId === clinicId);
};

// Add a new product
const addProduct = (product) => {
  db.products.push(product);
  return product;
};

// Update product
const updateProduct = (id, updates) => {
  const index = db.products.findIndex(product => product.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing product data
  const updatedProduct = {
    ...db.products[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.products[index] = updatedProduct;
  
  return updatedProduct;
};

// Delete product
const deleteProduct = (id) => {
  const initialLength = db.products.length;
  db.products = db.products.filter(product => product.id !== id);
  
  return db.products.length !== initialLength;
};

// Get product categories with counts
const getProductCategories = () => {
  const categories = {};
  
  // Count products in each category
  db.products.forEach(product => {
    if (product.category) {
      if (!categories[product.category]) {
        categories[product.category] = 0;
      }
      categories[product.category]++;
    }
  });
  
  // Convert to array of objects
  return Object.entries(categories).map(([name, count]) => ({ name, count }));
};

// Create order
const createOrder = (patientId, items) => {
  // Get product details for each item
  const orderItems = [];
  let total = 0;
  let clinicProducts = {};
  
  // Process each item
  items.forEach(item => {
    const product = getProductById(item.productId);
    
    if (product && product.inStock) {
      // Add to order items
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
      
      // Add to total
      total += product.price * item.quantity;
      
      // Group by clinic for order processing
      if (!clinicProducts[product.clinicId]) {
        clinicProducts[product.clinicId] = {
          clinicId: product.clinicId,
          clinicName: product.clinicName,
          items: []
        };
      }
      
      clinicProducts[product.clinicId].items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }
  });
  
  // Calculate reward points (10 points per dollar)
  const pointsEarned = Math.floor(total * 10);
  
  // Add reward points
  addRewardPoints(
    patientId,
    pointsEarned,
    `Order of ${orderItems.length} products`,
    Object.keys(clinicProducts)[0] // Use first clinic ID for simplicity
  );
  
  // Create order object
  const order = {
    id: uuidv4(),
    patientId,
    items: orderItems,
    clinicName: Object.values(clinicProducts)[0].clinicName, // Use first clinic name for display
    total,
    pointsEarned,
    status: 'processing',
    date: new Date().toISOString()
  };
  
  // In a real app, we would store the order in a database
  // For this prototype, we'll just return it
  return order;
};

// Create order from prescription
const createOrderFromPrescription = (prescription, medicationIds) => {
  // Get medications from prescription
  const medications = prescription.medications.filter(med => medicationIds.includes(med.id));
  
  // Create order items from medications
  // In a real app, these would be actual products in the database
  const orderItems = medications.map(med => ({
    productId: med.id,
    name: med.name,
    price: 25.00, // Dummy price for prototype
    quantity: 1
  }));
  
  // Calculate total
  const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate reward points (10 points per dollar)
  const pointsEarned = Math.floor(total * 10);
  
  // Add reward points
  addRewardPoints(
    prescription.patientId,
    pointsEarned,
    `Prescription medication order`,
    prescription.clinicId
  );
  
  // Create order object
  const order = {
    id: uuidv4(),
    patientId: prescription.patientId,
    items: orderItems,
    prescriptionId: prescription.id,
    clinicName: prescription.clinicName,
    total,
    pointsEarned,
    status: 'processing',
    date: new Date().toISOString()
  };
  
  // In a real app, we would store the order in a database
  // For this prototype, we'll just return it
  return order;
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByIds,
  getClinicProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  createOrder,
  createOrderFromPrescription
};
