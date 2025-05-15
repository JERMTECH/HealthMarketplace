const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('./auth');
const { 
  getPrescriptions, 
  getPrescriptionById, 
  addPrescription, 
  getPatientPrescriptions, 
  getClinicPrescriptions 
} = require('../models/prescriptions');
const { getClinicById } = require('../models/clinics');
const { getPatientById } = require('../models/patients');
const { createOrderFromPrescription } = require('../models/products');

// Get patient prescriptions
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== patientId && req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to view these prescriptions' });
    }
    
    const prescriptions = getPatientPrescriptions(patientId);
    
    res.json(prescriptions);
  } catch (error) {
    console.error(`Error fetching patient prescriptions ${req.params.patientId}:`, error);
    res.status(500).json({ message: 'Server error while fetching patient prescriptions' });
  }
});

// Get clinic prescriptions
router.get('/clinic/:clinicId', authenticate, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== clinicId && req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view these prescriptions' });
    }
    
    const prescriptions = getClinicPrescriptions(clinicId);
    
    res.json(prescriptions);
  } catch (error) {
    console.error(`Error fetching clinic prescriptions ${req.params.clinicId}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic prescriptions' });
  }
});

// Get prescription by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = getPrescriptionById(id);
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== prescription.patientId && req.user.id !== prescription.clinicId) {
      return res.status(403).json({ message: 'Unauthorized to view this prescription' });
    }
    
    res.json(prescription);
  } catch (error) {
    console.error(`Error fetching prescription ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching prescription' });
  }
});

// Create new prescription
router.post('/', authenticate, async (req, res) => {
  try {
    const { clinicId, patientId, doctorName, diagnosis, medications, notes } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== clinicId || req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to create prescriptions for this clinic' });
    }
    
    // Check if clinic exists
    const clinic = getClinicById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    // Check if patient exists
    const patient = getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Create prescription
    const prescription = {
      id: uuidv4(),
      clinicId,
      patientId,
      clinicName: clinic.name,
      patientName: patient.name,
      doctorName,
      diagnosis,
      medications: medications.map(med => ({
        id: uuidv4(),
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration
      })),
      notes,
      date: new Date().toISOString()
    };
    
    // Add prescription
    const newPrescription = addPrescription(prescription);
    
    res.status(201).json(newPrescription);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ message: 'Server error while creating prescription' });
  }
});

// Order prescription medications
router.post('/order', authenticate, async (req, res) => {
  try {
    const { prescriptionId, patientId, medicationIds } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== patientId || req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to order medications for this patient' });
    }
    
    // Check if prescription exists
    const prescription = getPrescriptionById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    // Check if this is the patient's prescription
    if (prescription.patientId !== patientId) {
      return res.status(403).json({ message: 'Unauthorized to order medications from this prescription' });
    }
    
    // Create order from prescription
    const order = createOrderFromPrescription(prescription, medicationIds);
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error ordering prescription medications:', error);
    res.status(500).json({ message: 'Server error while ordering prescription medications' });
  }
});

module.exports = router;
