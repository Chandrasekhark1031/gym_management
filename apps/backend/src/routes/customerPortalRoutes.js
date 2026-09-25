const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getMembership,
  getMembershipHistory,
  getPayments,
  getNotifications,
  markNotificationRead,
  getGymPaymentInfo,
  getDashboard,
} = require('../controllers/customerPortalController');
const { protect, requireCustomer } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(protect, requireCustomer);

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/profile/photo', upload.single('photo'), uploadProfilePhoto);
router.get('/membership', getMembership);
router.get('/membership/history', getMembershipHistory);
router.get('/payments', getPayments);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/gym-payment', getGymPaymentInfo);

module.exports = router;
