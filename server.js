const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

// Import routes
const { router: authRoutes } = require('./routes/auth');
const clinicsRoutes = require('./routes/clinics');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const productsRoutes = require('./routes/products');
const prescriptionsRoutes = require('./routes/prescriptions');
const rewardsRoutes = require('./routes/rewards');

// Initialize database
const { initializeDatabase } = require('./models/database');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clinics', clinicsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/rewards', rewardsRoutes);

// Handle SPA routing - serve index.html for any routes not handled above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
