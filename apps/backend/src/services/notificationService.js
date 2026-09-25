const crypto = require('crypto');
const pool = require('../config/database');
const { computeMembershipStatus, EXPIRING_SOON_DAYS } = require('../utils/membershipStatus');

const createNotificationIfMissing = async ({
  ownerId,
  customerId,
  notificationType,
  title,
  message,
}) => {
  const existing = await pool.query(
    `SELECT id FROM notifications
     WHERE owner_id = $1 AND customer_id = $2 AND notification_type = $3
       AND created_at > NOW() - INTERVAL '1 day'`,
    [ownerId, customerId, notificationType]
  );

  if (existing.rows.length > 0) {
    return;
  }

  await pool.query(
    `INSERT INTO notifications (id, owner_id, customer_id, title, message, is_read, notification_type, created_at)
     VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW())`,
    [crypto.randomUUID(), ownerId, customerId, title, message, notificationType]
  );
};

const syncOwnerNotifications = async (ownerId) => {
  const memberships = await pool.query(
    `SELECT m.id, m.end_date, c.id AS customer_id, c.name AS customer_name, p.name AS plan_name
     FROM memberships m
     INNER JOIN customers c ON c.id = m.customer_id
     INNER JOIN plans p ON p.id = m.plan_id
     WHERE c.owner_id = $1`,
    [ownerId]
  );

  for (const row of memberships.rows) {
    const { status, daysRemaining } = computeMembershipStatus(row.end_date);

    if (status === 'EXPIRING_SOON') {
      await createNotificationIfMissing({
        ownerId,
        customerId: row.customer_id,
        notificationType: 'MEMBERSHIP_EXPIRING',
        title: 'Membership expiring soon',
        message: `${row.customer_name}'s ${row.plan_name} membership expires in ${daysRemaining} day(s).`,
      });
    }

    if (status === 'EXPIRED' && daysRemaining === 0) {
      await createNotificationIfMissing({
        ownerId,
        customerId: row.customer_id,
        notificationType: 'MEMBERSHIP_EXPIRES_TODAY',
        title: 'Membership expires today',
        message: `${row.customer_name}'s ${row.plan_name} membership expires today.`,
      });
    }

    if (status === 'EXPIRED' && daysRemaining < 0) {
      await createNotificationIfMissing({
        ownerId,
        customerId: row.customer_id,
        notificationType: 'MEMBERSHIP_EXPIRED',
        title: 'Membership expired',
        message: `${row.customer_name}'s ${row.plan_name} membership has expired.`,
      });
    }
  }

  const pendingPayments = await pool.query(
    `SELECT p.id, c.id AS customer_id, c.name AS customer_name, p.amount
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     WHERE c.owner_id = $1 AND p.status = 'PENDING'`,
    [ownerId]
  );

  for (const row of pendingPayments.rows) {
    await createNotificationIfMissing({
      ownerId,
      customerId: row.customer_id,
      notificationType: 'PAYMENT_PENDING',
      title: 'Payment pending',
      message: `Payment of ${row.amount} is pending for ${row.customer_name}.`,
    });
  }
};

const syncCustomerNotifications = async (customerId, ownerId) => {
  const memberships = await pool.query(
    `SELECT m.end_date, p.name AS plan_name
     FROM memberships m
     INNER JOIN plans p ON p.id = m.plan_id
     WHERE m.customer_id = $1
     ORDER BY m.end_date DESC`,
    [customerId]
  );

  if (memberships.rows.length === 0) {
    return;
  }

  const latest = memberships.rows[0];
  const { status, daysRemaining } = computeMembershipStatus(latest.end_date);

  if (status === 'EXPIRING_SOON') {
    await createNotificationIfMissing({
      ownerId,
      customerId,
      notificationType: 'CUSTOMER_MEMBERSHIP_EXPIRING',
      title: 'Your membership is expiring soon',
      message: `Your ${latest.plan_name} membership expires in ${daysRemaining} day(s).`,
    });
  }

  if (status === 'EXPIRED') {
    await createNotificationIfMissing({
      ownerId,
      customerId,
      notificationType: 'CUSTOMER_MEMBERSHIP_EXPIRED',
      title: 'Your membership expired',
      message: `Your ${latest.plan_name} membership has expired.`,
    });
  }

  const pending = await pool.query(
    `SELECT amount FROM payments WHERE customer_id = $1 AND status = 'PENDING' ORDER BY payment_date DESC LIMIT 1`,
    [customerId]
  );

  if (pending.rows.length > 0) {
    await createNotificationIfMissing({
      ownerId,
      customerId,
      notificationType: 'CUSTOMER_PAYMENT_PENDING',
      title: 'Payment pending',
      message: `Your payment of ${pending.rows[0].amount} is pending.`,
    });
  }
};

module.exports = {
  syncOwnerNotifications,
  syncCustomerNotifications,
  EXPIRING_SOON_DAYS,
};
