const express = require('express');
const { register, login, getMe, changePassword } = require('../controllers/customerAuthController');
const { protect, requireCustomer } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'customer-register' }),
  register
);

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'customer-login' }),
  login
);

router.get('/me', protect, requireCustomer, getMe);
router.post('/change-password', protect, requireCustomer, changePassword);

module.exports = router;
