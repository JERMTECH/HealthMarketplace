const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('./auth');
const { 
  getProducts, 
  getProductById, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  getProductCategories, 
  getProductsByIds,
  getClinicProducts
} = require('../models/products');
const { getClinicById } = require('../models/clinics');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, clinicId, search, minPrice, maxPrice } = req.query;
    
    // Get all products
    const products = getProducts();
    
    // Filter products
    let filteredProducts = [...products];
    
    if (category) {
      filteredProducts = filteredProducts.filter(product => 
        product.category && product.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (clinicId) {
      filteredProducts = filteredProducts.filter(product => 
        product.clinicId === clinicId
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchLower) || 
        (product.description && product.description.toLowerCase().includes(searchLower))
      );
    }
    
    if (minPrice) {
      filteredProducts = filteredProducts.filter(product => 
        product.price >= parseFloat(minPrice)
      );
    }
    
    if (maxPrice) {
      filteredProducts = filteredProducts.filter(product => 
        product.price <= parseFloat(maxPrice)
      );
    }
    
    // Sort products
    const sort = req.query.sort || 'name-asc';
    
    switch (sort) {
      case 'name-asc':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      default:
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    res.json(filteredProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = getProductCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ message: 'Server error while fetching product categories' });
  }
});

// Get products by batch of IDs
router.post('/batch', async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'Product IDs are required' });
    }
    
    const products = getProductsByIds(productIds);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products batch:', error);
    res.status(500).json({ message: 'Server error while fetching products batch' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = getProductById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
});

// Create new product
router.post('/', authenticate, async (req, res) => {
  try {
    const { clinicId, name, description, price, category, inStock } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to add products for this clinic' });
    }
    
    // Check if clinic exists
    const clinic = getClinicById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    // Create product
    const product = {
      id: uuidv4(),
      clinicId,
      clinicName: clinic.name,
      name,
      description,
      price: parseFloat(price),
      category,
      inStock: Boolean(inStock),
      createdAt: new Date().toISOString()
    };
    
    // Add product
    const newProduct = addProduct(product);
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error while creating product' });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, inStock } = req.body;
    
    // Get product
    const product = getProductById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== product.clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to update this product' });
    }
    
    // Update product
    const updatedProduct = updateProduct(id, {
      name,
      description,
      price: parseFloat(price),
      category,
      inStock: Boolean(inStock)
    });
    
    res.json(updatedProduct);
  } catch (error) {
    console.error(`Error updating product ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while updating product' });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product
    const product = getProductById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== product.clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to delete this product' });
    }
    
    // Delete product
    const result = deleteProduct(id);
    
    res.json({ message: 'Product deleted successfully', success: result });
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
});

// Get clinic products
router.get('/clinic/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const products = getClinicProducts(clinicId);
    
    res.json(products);
  } catch (error) {
    console.error(`Error fetching clinic products ${req.params.clinicId}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic products' });
  }
});

module.exports = router;
