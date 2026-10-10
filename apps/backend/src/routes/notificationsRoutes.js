const express = require('express');
const { listNotifications, createNotification, markNotificationRead } = require('../controllers/notificationsController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const { remindMembership } = require('../controllers/workspaceController');
const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listNotifications);
router.post('/', createNotification);
router.post('/remind', remindMembership);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
