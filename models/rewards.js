const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

// Get rewards information
const getRewardsInfo = () => {
  return db.rewardsInfo;
};

// Get partner shops
const getPartnerShops = () => {
  return db.rewardsInfo.partnerShops;
};

// Get patient rewards
const getPatientRewards = (patientId) => {
  // Get total points
  const totalPoints = db.rewards.patientPoints[patientId] || 0;
  
  // Get points history
  const history = db.rewards.pointsHistory
    .filter(entry => entry.patientId === patientId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Get card information
  const card = db.rewards.cards.find(card => card.patientId === patientId);
  
  return {
    totalPoints,
    history,
    card
  };
};

// Add reward points
const addRewardPoints = (patientId, points, description, sourceId) => {
  // Initialize patient points if not already done
  if (!db.rewards.patientPoints[patientId]) {
    db.rewards.patientPoints[patientId] = 0;
  }
  
  // Add points to total
  db.rewards.patientPoints[patientId] += points;
  
  // Create history entry
  const historyEntry = {
    id: uuidv4(),
    patientId,
    points,
    description,
    sourceId,
    date: new Date().toISOString()
  };
  
  // Add to history
  db.rewards.pointsHistory.push(historyEntry);
  
  return {
    pointsAdded: points,
    totalPoints: db.rewards.patientPoints[patientId],
    historyEntry
  };
};

// Request a rewards card
const requestRewardsCard = (patientId) => {
  // Check if patient already has a card
  const existingCard = db.rewards.cards.find(card => card.patientId === patientId);
  
  if (existingCard) {
    return existingCard;
  }
  
  // Generate card number
  const cardNumber = generateCardNumber();
  
  // Create card
  const card = {
    patientId,
    cardNumber,
    issuedDate: new Date().toISOString(),
    status: 'active'
  };
  
  // Add to cards
  db.rewards.cards.push(card);
  
  return card;
};

// Generate a random 16-digit card number
const generateCardNumber = () => {
  let cardNumber = '';
  for (let i = 0; i < 16; i++) {
    cardNumber += Math.floor(Math.random() * 10);
    if ((i + 1) % 4 === 0 && i < 15) {
      cardNumber += '-';
    }
  }
  return cardNumber;
};

module.exports = {
  getRewardsInfo,
  getPartnerShops,
  getPatientRewards,
  addRewardPoints,
  requestRewardsCard
};
