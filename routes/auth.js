const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { getUsers, addUser, getUserByEmail } = require('../models/users');
const { addClinic } = require('../models/clinics');
const { addPatient } = require('../models/patients');

// JWT Secret - in a real app, this would be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'medimarket-secret-key';

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { type, name, email, password, phone, address, specialization } = req.body;
    
    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique ID
    const userId = uuidv4();
    
    // Create user object
    const user = {
      id: userId,
      type,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    // Add user to database
    addUser(user);
    
    // Create type-specific profile
    if (type === 'clinic') {
      addClinic({
        id: userId,
        name,
        email,
        phone,
        address,
        specialization,
        location: address // Using address as location for simplicity
      });
    } else if (type === 'patient') {
      addPatient({
        id: userId,
        name,
        email,
        phone,
        address
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, type, name, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return token and user info (without password)
    const userInfo = { id: userId, type, name, email };
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userInfo
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, type: user.type, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return token and user info (without password)
    const userInfo = {
      id: user.id,
      type: user.type,
      name: user.name,
      email: user.email
    };
    
    res.json({
      message: 'Login successful',
      token,
      user: userInfo
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Check authentication status
router.get('/check', authenticate, (req, res) => {
  res.json({
    message: 'Authenticated',
    user: req.user
  });
});

// Export authentication middleware and router
module.exports = {
  router,
  authenticate
};
