const express = require('express');
const router = express.Router();

const { authenticate } = require('./auth');
const { getPatientById, updatePatient } = require('../models/patients');

// Get patient by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== id && req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view this patient profile' });
    }
    
    const patient = getPatientById(id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    console.error(`Error fetching patient ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching patient' });
  }
});

// Update patient
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== id || req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to update this patient profile' });
    }
    
    // Check if patient exists
    const patient = getPatientById(id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Update patient
    const updatedPatient = updatePatient(id, {
      name,
      address,
      phone
    });
    
    res.json(updatedPatient);
  } catch (error) {
    console.error(`Error updating patient ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while updating patient' });
  }
});

module.exports = router;
