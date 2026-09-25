const express = require('express');
const {
  getOwnerStats,
  getExpiringMemberships,
  getRecentPayments,
} = require('../controllers/dashboardController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, requireOwner, getOwnerStats);
router.get('/expiring-memberships', protect, requireOwner, getExpiringMemberships);
router.get('/recent-payments', protect, requireOwner, getRecentPayments);

module.exports = router;
