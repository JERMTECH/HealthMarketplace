const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('./auth');
const { 
  getPatientRewards, 
  addRewardPoints, 
  getRewardsInfo, 
  getPartnerShops,
  requestRewardsCard
} = require('../models/rewards');

// Get rewards information
router.get('/info', async (req, res) => {
  try {
    const rewardsInfo = getRewardsInfo();
    res.json(rewardsInfo);
  } catch (error) {
    console.error('Error fetching rewards info:', error);
    res.status(500).json({ message: 'Server error while fetching rewards information' });
  }
});

// Get partner shops
router.get('/partners', async (req, res) => {
  try {
    const partners = getPartnerShops();
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partner shops:', error);
    res.status(500).json({ message: 'Server error while fetching partner shops' });
  }
});

// Get patient rewards
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if user is authorized
    if (req.user.id !== patientId && req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Unauthorized to view these rewards' });
    }
    
    const rewards = getPatientRewards(patientId);
    
    res.json(rewards);
  } catch (error) {
    console.error(`Error fetching patient rewards ${req.params.patientId}:`, error);
    res.status(500).json({ message: 'Server error while fetching patient rewards' });
  }
});

// Add reward points to patient
router.post('/points', authenticate, async (req, res) => {
  try {
    const { patientId, points, description } = req.body;
    
    // Only clinics can add points
    if (req.user.type !== 'clinic') {
      return res.status(403).json({ message: 'Unauthorized to add reward points' });
    }
    
    // Add points
    const result = addRewardPoints(patientId, points, description, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error('Error adding reward points:', error);
    res.status(500).json({ message: 'Server error while adding reward points' });
  }
});

// Request rewards card
router.post('/request-card', authenticate, async (req, res) => {
  try {
    const patientId = req.user.id;
    
    // Check if user is a patient
    if (req.user.type !== 'patient') {
      return res.status(403).json({ message: 'Only patients can request rewards cards' });
    }
    
    // Request card
    const card = requestRewardsCard(patientId);
    
    res.json(card);
  } catch (error) {
    console.error('Error requesting rewards card:', error);
    res.status(500).json({ message: 'Server error while requesting rewards card' });
  }
});

module.exports = router;
