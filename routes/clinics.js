const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('./auth');
const { 
  getClinics, 
  getClinicById, 
  updateClinic, 
  getFeaturedClinics 
} = require('../models/clinics');
const { 
  getClinicServices, 
  addClinicService, 
  getClinicServiceById, 
  updateClinicService, 
  deleteClinicService 
} = require('../models/clinics');
const { 
  getClinicStats, 
  getClinicAppointments 
} = require('../models/appointments');
const { getClinicProducts } = require('../models/products');

// Get all clinics
router.get('/', async (req, res) => {
  try {
    const clinics = getClinics();
    
    // Remove sensitive information
    const sanitizedClinics = clinics.map(clinic => {
      const { id, name, specialization, address, location } = clinic;
      return { id, name, specialization, address, location };
    });
    
    res.json(sanitizedClinics);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ message: 'Server error while fetching clinics' });
  }
});

// Get featured clinics
router.get('/featured', async (req, res) => {
  try {
    const featuredClinics = getFeaturedClinics();
    res.json(featuredClinics);
  } catch (error) {
    console.error('Error fetching featured clinics:', error);
    res.status(500).json({ message: 'Server error while fetching featured clinics' });
  }
});

// Get clinic by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clinic = getClinicById(id);
    
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    res.json(clinic);
  } catch (error) {
    console.error(`Error fetching clinic ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic' });
  }
});

// Update clinic
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, specialization } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== id || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to update this clinic' });
    }
    
    // Check if clinic exists
    const clinic = getClinicById(id);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    // Update clinic
    const updatedClinic = updateClinic(id, {
      name,
      address,
      phone,
      specialization
    });
    
    res.json(updatedClinic);
  } catch (error) {
    console.error(`Error updating clinic ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while updating clinic' });
  }
});

// Get clinic statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== id || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view these statistics' });
    }
    
    // Get statistics
    const appointments = getClinicAppointments(id);
    const products = getClinicProducts(id);
    
    const stats = getClinicStats(id, appointments, products);
    
    res.json(stats);
  } catch (error) {
    console.error(`Error fetching clinic stats ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic statistics' });
  }
});

// Get clinic services
router.get('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;
    const services = getClinicServices(id);
    
    res.json(services);
  } catch (error) {
    console.error(`Error fetching services for clinic ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic services' });
  }
});

// Add clinic service
router.post('/services', authenticate, async (req, res) => {
  try {
    const { clinicId, name, description, price, duration, available } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to add services for this clinic' });
    }
    
    // Create service
    const service = {
      id: uuidv4(),
      clinicId,
      name,
      description,
      price: parseFloat(price),
      duration: parseInt(duration),
      available: Boolean(available),
      createdAt: new Date().toISOString()
    };
    
    // Add service
    const newService = addClinicService(service);
    
    res.status(201).json(newService);
  } catch (error) {
    console.error('Error adding clinic service:', error);
    res.status(500).json({ message: 'Server error while adding clinic service' });
  }
});

// Get clinic service by ID
router.get('/services/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const service = getClinicServiceById(id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== service.clinicId && req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view this service' });
    }
    
    res.json(service);
  } catch (error) {
    console.error(`Error fetching service ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching service' });
  }
});

// Update clinic service
router.put('/services/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, available } = req.body;
    
    // Get service
    const service = getClinicServiceById(id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== service.clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to update this service' });
    }
    
    // Update service
    const updatedService = updateClinicService(id, {
      name,
      description,
      price: parseFloat(price),
      duration: parseInt(duration),
      available: Boolean(available)
    });
    
    res.json(updatedService);
  } catch (error) {
    console.error(`Error updating service ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while updating service' });
  }
});

// Delete clinic service
router.delete('/services/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get service
    const service = getClinicServiceById(id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== service.clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to delete this service' });
    }
    
    // Delete service
    const result = deleteClinicService(id);
    
    res.json({ message: 'Service deleted successfully', success: result });
  } catch (error) {
    console.error(`Error deleting service ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while deleting service' });
  }
});

module.exports = router;
