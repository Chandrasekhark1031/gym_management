const crypto = require('crypto');
const pool = require('../config/database');
const { syncOwnerNotifications } = require('../services/notificationService');
const { getCustomerForOwner } = require('../utils/ownership');

const listNotifications = async (req, res, next) => {
  try {
    await syncOwnerNotifications(req.ownerId);

    const result = await pool.query(
      `SELECT n.*, c.name AS customer_name
       FROM notifications n
       LEFT JOIN customers c ON c.id = n.customer_id
       WHERE n.owner_id = $1
       ORDER BY n.created_at DESC`,
      [req.ownerId]
    );

    const unreadCount = result.rows.filter((row) => !row.is_read).length;

    return res.status(200).json({
      success: true,
      notifications: result.rows.map((row) => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        type: row.notification_type,
        createdAt: row.created_at,
      })),
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const { customerId, title, message, notificationType } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    if (customerId) {
      const customer = await getCustomerForOwner(customerId, req.ownerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
    }

    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO notifications (id, owner_id, customer_id, title, message, is_read, notification_type, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW())
       RETURNING *`,
      [id, req.ownerId, customerId || null, title, message, notificationType || 'ANNOUNCEMENT']
    );

    return res.status(201).json({
      success: true,
      notification: {
        id: result.rows[0].id,
        customerId: result.rows[0].customer_id,
        title: result.rows[0].title,
        message: result.rows[0].message,
        isRead: result.rows[0].is_read,
        type: result.rows[0].notification_type,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND owner_id = $2
       RETURNING *`,
      [req.params.id, req.ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listNotifications,
  createNotification,
  markNotificationRead,
};
