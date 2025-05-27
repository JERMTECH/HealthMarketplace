// This file sets up a Node.js Express server to serve the frontend static files and (optionally) provide API endpoints.
// In this project, the FastAPI backend already serves static files, so this file is not needed unless you want to run the frontend separately.

// Import required modules for the server
// const express = require('express');
// const path = require('path');
// const cors = require('cors');
// const morgan = require('morgan');

// Import API route handlers (commented out because API is handled by Python backend)
// const { router: authRoutes } = require('./routes/auth');
// const clinicsRoutes = require('./routes/clinics');
// const patientsRoutes = require('./routes/patients');
// const appointmentsRoutes = require('./routes/appointments');
// const productsRoutes = require('./routes/products');
// const prescriptionsRoutes = require('./routes/prescriptions');
// const rewardsRoutes = require('./routes/rewards');

// Optionally initialize a database (not needed if Python backend handles all DB)
// const { initializeDatabase } = require('./models/database');

// Create the Express app
// const app = express();
// const PORT = process.env.PORT || 8000;

// Set up middleware for CORS, JSON parsing, URL-encoded parsing, and logging
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));

// Serve static files from the 'public' directory (frontend assets)
// app.use(express.static(path.join(__dirname, 'public')));

// Register API routes (commented out, handled by FastAPI backend)
// app.use('/api/auth', authRoutes);
// app.use('/api/clinics', clinicsRoutes);
// app.use('/api/patients', patientsRoutes);
// app.use('/api/appointments', appointmentsRoutes);
// app.use('/api/products', productsRoutes);
// app.use('/api/prescriptions', prescriptionsRoutes);
// app.use('/api/rewards', rewardsRoutes);

// For single-page applications, serve index.html for any unknown route
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// Error handling middleware for catching and displaying errors
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     message: err.message || 'An unexpected error occurred',
//     error: process.env.NODE_ENV === 'development' ? err : {}
//   });
// });

// Start the server after initializing the database (if needed)
// initializeDatabase()
//   .then(() => {
//     app.listen(PORT, '0.0.0.0', () => {
//       console.log(`Server is running on http://0.0.0.0:${PORT}`);
//     });
//   })
//   .catch(err => {
//     console.error('Failed to initialize database:', err);
//     process.exit(1);
//   });
