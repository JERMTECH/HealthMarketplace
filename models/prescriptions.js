const { db } = require('./database');

// Get all prescriptions
const getPrescriptions = () => {
  return db.prescriptions;
};

// Get prescription by ID
const getPrescriptionById = (id) => {
  return db.prescriptions.find(prescription => prescription.id === id);
};

// Add a new prescription
const addPrescription = (prescription) => {
  db.prescriptions.push(prescription);
  return prescription;
};

// Get patient prescriptions
const getPatientPrescriptions = (patientId) => {
  return db.prescriptions.filter(prescription => prescription.patientId === patientId);
};

// Get clinic prescriptions
const getClinicPrescriptions = (clinicId) => {
  return db.prescriptions.filter(prescription => prescription.clinicId === clinicId);
};

// Update prescription
const updatePrescription = (id, updates) => {
  const index = db.prescriptions.findIndex(prescription => prescription.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing prescription data
  const updatedPrescription = {
    ...db.prescriptions[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.prescriptions[index] = updatedPrescription;
  
  return updatedPrescription;
};

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  addPrescription,
  getPatientPrescriptions,
  getClinicPrescriptions,
  updatePrescription
};
