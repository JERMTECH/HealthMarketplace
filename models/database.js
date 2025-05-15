// In-memory database for MediMarket

// Data storage
const db = {
  users: [],
  clinics: [],
  patients: [],
  appointments: [],
  products: [],
  prescriptions: [],
  rewards: {
    patientPoints: {},
    pointsHistory: [],
    cards: []
  },
  services: []
};

// Initialize database with sample data
const initializeDatabase = async () => {
  console.log('Initializing in-memory database...');

  // Add sample clinics
  db.clinics = [
    {
      id: 'clinic1',
      name: 'City Health Clinic',
      email: 'info@cityhealthclinic.com',
      phone: '123-456-7890',
      address: '123 Main St, City Center',
      location: 'City Center',
      specialization: 'General Practice',
      createdAt: new Date().toISOString()
    },
    {
      id: 'clinic2',
      name: 'Family Medical Center',
      email: 'contact@familymedical.com',
      phone: '234-567-8901',
      address: '456 Oak Ave, Westside',
      location: 'Westside',
      specialization: 'Family Medicine',
      createdAt: new Date().toISOString()
    },
    {
      id: 'clinic3',
      name: 'Cardio Health Specialists',
      email: 'appointments@cardiohealth.com',
      phone: '345-678-9012',
      address: '789 Heart Blvd, Northend',
      location: 'Northend',
      specialization: 'Cardiology',
      createdAt: new Date().toISOString()
    }
  ];

  // Add clinic users
  db.users = [
    {
      id: 'clinic1',
      type: 'clinic',
      name: 'City Health Clinic',
      email: 'info@cityhealthclinic.com',
      password: '$2a$10$PFGz9U2s1bHmWMl8.Cw7G.1J1k7asutZVTfZ3VmztGF9OJuiJaKnq', // 'password123'
      createdAt: new Date().toISOString()
    },
    {
      id: 'clinic2',
      type: 'clinic',
      name: 'Family Medical Center',
      email: 'contact@familymedical.com',
      password: '$2a$10$PFGz9U2s1bHmWMl8.Cw7G.1J1k7asutZVTfZ3VmztGF9OJuiJaKnq', // 'password123'
      createdAt: new Date().toISOString()
    },
    {
      id: 'clinic3',
      type: 'clinic',
      name: 'Cardio Health Specialists',
      email: 'appointments@cardiohealth.com',
      password: '$2a$10$PFGz9U2s1bHmWMl8.Cw7G.1J1k7asutZVTfZ3VmztGF9OJuiJaKnq', // 'password123'
      createdAt: new Date().toISOString()
    }
  ];

  // Add sample clinic services
  db.services = [
    {
      id: 'service1',
      clinicId: 'clinic1',
      name: 'General Consultation',
      description: 'General health check-up and consultation',
      price: 50.00,
      duration: 30,
      available: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'service2',
      clinicId: 'clinic1',
      name: 'Vaccination',
      description: 'Standard vaccinations for adults and children',
      price: 35.00,
      duration: 15,
      available: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'service3',
      clinicId: 'clinic2',
      name: 'Family Consultation',
      description: 'Family health assessment and consultation',
      price: 75.00,
      duration: 45,
      available: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'service4',
      clinicId: 'clinic3',
      name: 'Cardiac Assessment',
      description: 'Complete cardiac evaluation including ECG',
      price: 120.00,
      duration: 60,
      available: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Add sample products
  db.products = [
    {
      id: 'product1',
      clinicId: 'clinic1',
      clinicName: 'City Health Clinic',
      name: 'Vitamin C Supplements',
      description: 'Boost your immune system with daily Vitamin C',
      price: 12.99,
      category: 'Supplements',
      inStock: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'product2',
      clinicId: 'clinic1',
      clinicName: 'City Health Clinic',
      name: 'Digital Thermometer',
      description: 'Accurate temperature readings in seconds',
      price: 24.99,
      category: 'Medical Devices',
      inStock: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'product3',
      clinicId: 'clinic2',
      clinicName: 'Family Medical Center',
      name: "Children's Multivitamins",
      description: 'Chewable multivitamins for kids aged 4-12',
      price: 14.99,
      category: 'Supplements',
      inStock: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'product4',
      clinicId: 'clinic3',
      clinicName: 'Cardio Health Specialists',
      name: 'Blood Pressure Monitor',
      description: 'Home blood pressure monitoring device',
      price: 79.99,
      category: 'Medical Devices',
      inStock: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'product5',
      clinicId: 'clinic3',
      clinicName: 'Cardio Health Specialists',
      name: 'Omega-3 Fish Oil',
      description: 'Support heart health with high-quality omega-3',
      price: 22.99,
      category: 'Supplements',
      inStock: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Add rewards info
  db.rewardsInfo = {
    earnRates: {
      products: 10, // points per $1
      services: 5,  // points per $1
      referral: 500 // flat points for referral
    },
    redemptionRate: 100, // 100 points = $1
    partnerShops: [
      {
        id: 'partner1',
        name: 'HealthMart Pharmacy',
        description: 'A complete pharmacy with prescription and OTC medications',
        location: 'Multiple locations citywide',
        categories: ['Pharmacy', 'Health Products'],
        website: 'https://example.com/healthmart'
      },
      {
        id: 'partner2',
        name: 'Wellness Nutrition',
        description: 'Specialty store for nutritional supplements and health foods',
        location: 'Downtown & Eastside',
        categories: ['Nutrition', 'Supplements'],
        website: 'https://example.com/wellness'
      },
      {
        id: 'partner3',
        name: 'MediEquip Store',
        description: 'Medical equipment and mobility aids for home care',
        location: 'Southside Medical District',
        categories: ['Medical Equipment', 'Home Care'],
        website: 'https://example.com/mediequip'
      }
    ]
  };

  console.log('Database initialized successfully');
  return true;
};

// Export database and initialization function
module.exports = {
  db,
  initializeDatabase
};
