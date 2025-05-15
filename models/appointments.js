const { db } = require('./database');
const { addRewardPoints } = require('./rewards');

// Get all appointments
const getAppointments = () => {
  return db.appointments;
};

// Get appointment by ID
const getAppointmentById = (id) => {
  return db.appointments.find(appointment => appointment.id === id);
};

// Add a new appointment
const addAppointment = (appointment) => {
  db.appointments.push(appointment);
  return appointment;
};

// Update appointment status
const updateAppointmentStatus = (id, status) => {
  const index = db.appointments.findIndex(appointment => appointment.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Update status
  db.appointments[index].status = status;
  db.appointments[index].updatedAt = new Date().toISOString();
  
  // If the appointment is confirmed and has a service with a price, add reward points
  if (status === 'confirmed' && db.appointments[index].service) {
    // Find the service price
    const service = db.services.find(
      s => s.clinicId === db.appointments[index].clinicId && 
           s.name === db.appointments[index].service
    );
    
    if (service && service.price) {
      // Add reward points (5 points per dollar for services)
      const pointsEarned = Math.floor(service.price * 5);
      addRewardPoints(
        db.appointments[index].patientId,
        pointsEarned,
        `Appointment: ${db.appointments[index].service}`,
        db.appointments[index].clinicId
      );
    }
  }
  
  return db.appointments[index];
};

// Get patient appointments
const getPatientAppointments = (patientId) => {
  return db.appointments.filter(appointment => appointment.patientId === patientId);
};

// Get clinic appointments
const getClinicAppointments = (clinicId) => {
  return db.appointments.filter(appointment => appointment.clinicId === clinicId);
};

// Get recent clinic appointments (limited to 5)
const getRecentClinicAppointments = (clinicId) => {
  return db.appointments
    .filter(appointment => appointment.clinicId === clinicId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
};

// Get clinic statistics
const getClinicStats = (clinicId, appointments, products) => {
  // Filter appointments and products by clinic ID if not already filtered
  const clinicAppointments = appointments || getClinicAppointments(clinicId);
  const clinicProducts = products || db.products.filter(product => product.clinicId === clinicId);
  
  // Calculate appointment statistics
  const totalAppointments = clinicAppointments.length;
  const pendingAppointments = clinicAppointments.filter(a => a.status.toLowerCase() === 'pending').length;
  const confirmedAppointments = clinicAppointments.filter(a => a.status.toLowerCase() === 'confirmed').length;
  
  // Calculate product statistics
  const totalProducts = clinicProducts.length;
  const inStockProducts = clinicProducts.filter(p => p.inStock).length;
  
  // Calculate revenue
  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  
  // Current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Calculate from appointments
  clinicAppointments.forEach(appointment => {
    if (appointment.status.toLowerCase() === 'confirmed') {
      // Find the service price
      const service = db.services.find(
        s => s.clinicId === clinicId && s.name === appointment.service
      );
      
      if (service && service.price) {
        totalRevenue += service.price;
        
        // Check if this month
        const appointmentDate = new Date(appointment.date);
        if (
          appointmentDate.getMonth() === currentMonth && 
          appointmentDate.getFullYear() === currentYear
        ) {
          thisMonthRevenue += service.price;
        }
      }
    }
  });
  
  // Calculate from orders (in a real app, we would have an orders table)
  // For simplicity, we'll just use some dummy numbers
  totalRevenue += 1250;
  thisMonthRevenue += 350;
  
  return {
    appointments: {
      total: totalAppointments,
      pending: pendingAppointments,
      confirmed: confirmedAppointments
    },
    products: {
      total: totalProducts,
      inStock: inStockProducts
    },
    revenue: {
      total: totalRevenue,
      thisMonth: thisMonthRevenue
    }
  };
};

module.exports = {
  getAppointments,
  getAppointmentById,
  addAppointment,
  updateAppointmentStatus,
  getPatientAppointments,
  getClinicAppointments,
  getRecentClinicAppointments,
  getClinicStats
};
