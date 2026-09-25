const express = require('express');
const {
  login,
  registerOwner,
  getMe,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
  changePassword,
  updateProfile,
  uploadGymLogo,
  uploadPaymentQrCode,
  changePhone,
  requestEmailChange,
  verifyEmailChange,
  updateEmail,
} = require('../controllers/authController');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/rateLimiter');
const { uploadLogo, uploadQrCode } = require('../middleware/upload');

const router = express.Router();

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth-register' }),
  registerOwner
);

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth-login' }),
  login
);

router.post(
  '/forgot-password',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth-forgot' }),
  forgotPassword
);

router.post(
  '/verify-otp',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyPrefix: 'auth-verify-otp' }),
  verifyOtpForReset
);

router.post('/reset-password', resetPassword);

router.get('/me', protect, requireOwner, getMe);
router.post('/change-password', protect, requireOwner, changePassword);
router.patch('/profile', protect, requireOwner, updateProfile);
router.post('/profile/logo', protect, requireOwner, uploadLogo.single('logo'), uploadGymLogo);
router.post('/profile/qr-code', protect, requireOwner, uploadQrCode.single('qrCode'), uploadPaymentQrCode);
router.patch('/phone', protect, requireOwner, changePhone);
router.patch('/email', protect, requireOwner, updateEmail);
router.post('/change-email', protect, requireOwner, updateEmail);
router.post('/change-email/request', protect, requireOwner, requestEmailChange);
router.post('/change-email/verify', protect, requireOwner, verifyEmailChange);

module.exports = router;
