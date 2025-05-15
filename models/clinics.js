const { db } = require('./database');

// Get all clinics
const getClinics = () => {
  return db.clinics;
};

// Get clinic by ID
const getClinicById = (id) => {
  return db.clinics.find(clinic => clinic.id === id);
};

// Get featured clinics (for homepage)
const getFeaturedClinics = () => {
  // In a real app, this might use criteria like ratings, number of appointments, etc.
  // For now, we'll just return all clinics, limited to 3
  return db.clinics.slice(0, 3);
};

// Add a new clinic
const addClinic = (clinic) => {
  db.clinics.push(clinic);
  return clinic;
};

// Update clinic
const updateClinic = (id, updates) => {
  const index = db.clinics.findIndex(clinic => clinic.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing clinic data
  const updatedClinic = {
    ...db.clinics[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.clinics[index] = updatedClinic;
  
  // Also update the user name if it changed
  if (updates.name) {
    const userIndex = db.users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      db.users[userIndex].name = updates.name;
    }
  }
  
  return updatedClinic;
};

// Delete clinic
const deleteClinic = (id) => {
  const initialLength = db.clinics.length;
  db.clinics = db.clinics.filter(clinic => clinic.id !== id);
  
  return db.clinics.length !== initialLength;
};

// Get clinic services
const getClinicServices = (clinicId) => {
  return db.services.filter(service => service.clinicId === clinicId);
};

// Get clinic service by ID
const getClinicServiceById = (id) => {
  return db.services.find(service => service.id === id);
};

// Add clinic service
const addClinicService = (service) => {
  db.services.push(service);
  return service;
};

// Update clinic service
const updateClinicService = (id, updates) => {
  const index = db.services.findIndex(service => service.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing service data
  const updatedService = {
    ...db.services[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.services[index] = updatedService;
  
  return updatedService;
};

// Delete clinic service
const deleteClinicService = (id) => {
  const initialLength = db.services.length;
  db.services = db.services.filter(service => service.id !== id);
  
  return db.services.length !== initialLength;
};

module.exports = {
  getClinics,
  getClinicById,
  getFeaturedClinics,
  addClinic,
  updateClinic,
  deleteClinic,
  getClinicServices,
  getClinicServiceById,
  addClinicService,
  updateClinicService,
  deleteClinicService
};
