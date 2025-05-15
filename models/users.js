const { db } = require('./database');

// Get all users
const getUsers = () => {
  return db.users;
};

// Get user by ID
const getUserById = (id) => {
  return db.users.find(user => user.id === id);
};

// Get user by email
const getUserByEmail = (email) => {
  return db.users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Add a new user
const addUser = (user) => {
  db.users.push(user);
  return user;
};

// Update user
const updateUser = (id, updates) => {
  const index = db.users.findIndex(user => user.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Merge updates with existing user data
  const updatedUser = {
    ...db.users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  db.users[index] = updatedUser;
  
  return updatedUser;
};

// Delete user
const deleteUser = (id) => {
  const initialLength = db.users.length;
  db.users = db.users.filter(user => user.id !== id);
  
  return db.users.length !== initialLength;
};

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  addUser,
  updateUser,
  deleteUser
};
