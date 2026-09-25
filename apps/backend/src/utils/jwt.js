const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn, jwtResetExpiresIn } = require('../config/env');

const generateToken = (ownerId, role = 'OWNER') => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ ownerId, role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
};

const generateCustomerToken = (customerId, ownerId) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ customerId, ownerId, role: 'CUSTOMER' }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
};

const generatePasswordResetToken = (ownerId) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ ownerId, purpose: 'password_reset' }, jwtSecret, {
    expiresIn: jwtResetExpiresIn,
  });
};

const verifyToken = (token) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, jwtSecret);
};

module.exports = {
  generateToken,
  generateCustomerToken,
  generatePasswordResetToken,
  verifyToken,
};
