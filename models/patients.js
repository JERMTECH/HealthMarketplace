const { db } = require('./database');

// Get all patients
const getPatients = () => {
  return db.patients;
};

// Get patient by ID
const getPatientById = (id) => {
  return db.patients.find(patient => patient.id === id);
};

// Add a new patient
const addPatient = (patient) => {
  db.patients.push(patient);
  return patient;
};

// Update patient
const updatePatient = (id, updates) => {
  const index = db.patients.findIndex(patient => patient.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing patient data
  const updatedPatient = {
    ...db.patients[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.patients[index] = updatedPatient;
  
  // Also update the user name if it changed
  if (updates.name) {
    const userIndex = db.users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      db.users[userIndex].name = updates.name;
    }
  }
  
  return updatedPatient;
};

// Delete patient
const deletePatient = (id) => {
  const initialLength = db.patients.length;
  db.patients = db.patients.filter(patient => patient.id !== id);
  
  return db.patients.length !== initialLength;
};

module.exports = {
  getPatients,
  getPatientById,
  addPatient,
  updatePatient,
  deletePatient
};
