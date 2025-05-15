const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('./auth');
const { 
  getAppointments, 
  getAppointmentById, 
  addAppointment, 
  updateAppointmentStatus, 
  getPatientAppointments, 
  getClinicAppointments, 
  getRecentClinicAppointments
} = require('../models/appointments');
const { getClinicById } = require('../models/clinics');
const { getPatientById } = require('../models/patients');

// Create a new appointment
router.post('/', authenticate, async (req, res) => {
  try {
    const { clinicId, patientId, service, date, notes } = req.body;
    
    // Check if user is authorized
    if (req.user.id !== patientId || req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to book appointments for this patient' });
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
    
    // Create appointment
    const appointment = {
      id: uuidv4(),
      clinicId,
      patientId,
      clinicName: clinic.name,
      patientName: patient.name,
      service,
      date,
      notes,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    
    // Add appointment
    const newAppointment = addAppointment(appointment);
    
    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Server error while creating appointment' });
  }
});

// Get appointment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = getAppointmentById(id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user is authorized
    if (req.user.id !== appointment.patientId && req.user.id !== appointment.clinicId) {
      return res.status(403).json({ message: 'Unauthorized to view this appointment' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error(`Error fetching appointment ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while fetching appointment' });
  }
});

// Update appointment status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get appointment
    const appointment = getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user is authorized
    const isClinic = req.user.id === appointment.clinicId && req.user.type === 'clinic';
    const isPatient = req.user.id === appointment.patientId && req.user.type === 'patient';
    
    if (!isClinic && !isPatient) {
      return res.status(403).json({ message: 'Unauthorized to update this appointment' });
    }
    
    // Patients can only cancel appointments
    if (isPatient && status !== 'cancelled') {
      return res.status(403).json({ message: 'Patients can only cancel appointments' });
    }
    
    // Update appointment status
    const updatedAppointment = updateAppointmentStatus(id, status);
    
    res.json(updatedAppointment);
  } catch (error) {
    console.error(`Error updating appointment status ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error while updating appointment status' });
  }
});

// Get patient appointments
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== patientId && req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to view these appointments' });
    }
    
    const appointments = getPatientAppointments(patientId);
    
    res.json(appointments);
  } catch (error) {
    console.error(`Error fetching patient appointments ${req.params.patientId}:`, error);
    res.status(500).json({ message: 'Server error while fetching patient appointments' });
  }
});

// Get clinic appointments
router.get('/clinic/:clinicId', authenticate, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== clinicId && req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view these appointments' });
    }
    
    const appointments = getClinicAppointments(clinicId);
    
    res.json(appointments);
  } catch (error) {
    console.error(`Error fetching clinic appointments ${req.params.clinicId}:`, error);
    res.status(500).json({ message: 'Server error while fetching clinic appointments' });
  }
});

// Get recent clinic appointments
router.get('/clinic/:clinicId/recent', authenticate, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== clinicId && req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to view these appointments' });
    }
    
    const appointments = getRecentClinicAppointments(clinicId);
    
    res.json(appointments);
  } catch (error) {
    console.error(`Error fetching recent clinic appointments ${req.params.clinicId}:`, error);
    res.status(500).json({ message: 'Server error while fetching recent clinic appointments' });
  }
});

module.exports = router;
