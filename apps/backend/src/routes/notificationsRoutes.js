const express = require('express');
const { listNotifications, createNotification, markNotificationRead } = require('../controllers/notificationsController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
