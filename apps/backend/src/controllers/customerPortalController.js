const pool = require('../config/database');
const { computeMembershipStatus } = require('../utils/membershipStatus');
const { syncCustomerNotifications } = require('../services/notificationService');

const assertCustomer = async (customerId) => {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  return result.rows[0] || null;
};

const getProfile = async (req, res, next) => {
  try {
    const customer = await assertCustomer(req.customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        photoUrl: customer.photo_url,
        accountStatus: customer.account_status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, address, photoUrl } = req.body;
    const result = await pool.query(
      `UPDATE customers
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           photo_url = COALESCE($3, photo_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name || null, address || null, photoUrl || null, req.customerId]
    );

    const customer = result.rows[0];
    return res.status(200).json({
      success: true,
      profile: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        photoUrl: customer.photo_url,
        accountStatus: customer.account_status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMembership = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM memberships m
       JOIN plans p ON p.id = m.plan_id
       WHERE m.customer_id = $1
       ORDER BY m.end_date DESC
       LIMIT 1`,
      [req.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, membership: null });
    }

    const row = result.rows[0];
    const statusInfo = computeMembershipStatus(row.end_date);

    return res.status(200).json({
      success: true,
      membership: {
        id: row.id,
        planName: row.plan_name,
        planPrice: Number(row.plan_price),
        startDate: row.start_date,
        endDate: row.end_date,
        status: statusInfo.status,
        daysRemaining: statusInfo.daysRemaining,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMembershipHistory = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM memberships m
       JOIN plans p ON p.id = m.plan_id
       WHERE m.customer_id = $1
       ORDER BY m.start_date DESC`,
      [req.customerId]
    );

    return res.status(200).json({
      success: true,
      memberships: result.rows.map((row) => ({
        id: row.id,
        planName: row.plan_name,
        planPrice: Number(row.plan_price),
        startDate: row.start_date,
        endDate: row.end_date,
        ...computeMembershipStatus(row.end_date),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC`,
      [req.customerId]
    );

    return res.status(200).json({
      success: true,
      payments: result.rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        status: row.status,
        notes: row.notes,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const customer = await assertCustomer(req.customerId);
    await syncCustomerNotifications(req.customerId, customer.owner_id);

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE customer_id = $1
         AND notification_type LIKE 'CUSTOMER_%'
       ORDER BY created_at DESC`,
      [req.customerId]
    );

    const unreadCount = result.rows.filter((row) => !row.is_read).length;

    return res.status(200).json({
      success: true,
      notifications: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        createdAt: row.created_at,
      })),
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND customer_id = $2
       RETURNING id`,
      [req.params.id, req.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const getGymPaymentInfo = async (req, res, next) => {
  try {
    const customer = await assertCustomer(req.customerId);
    const owner = await pool.query(
      'SELECT gym_name, phone, upi_id, photo_url, bank_candidate_name, payment_phone, qr_code_url FROM gym_owners WHERE id = $1',
      [customer.owner_id]
    );

    if (owner.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gym information not found' });
    }

    const gym = owner.rows[0];
    const upiPayload = gym.upi_id ? `upi://pay?pa=${encodeURIComponent(gym.upi_id)}&pn=${encodeURIComponent(gym.gym_name || 'Gym')}` : null;

    return res.status(200).json({
      success: true,
      gym: {
        name: gym.gym_name,
        phone: gym.phone,
        upiId: gym.upi_id,
        logoUrl: gym.photo_url,
        bankCandidateName: gym.bank_candidate_name,
        paymentPhone: gym.payment_phone,
        qrCodeUrl: gym.qr_code_url,
        upiQrPayload: upiPayload,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const customer = await assertCustomer(req.customerId);
    const owner = await pool.query(
      'SELECT gym_name, phone, upi_id FROM gym_owners WHERE id = $1',
      [customer.owner_id]
    );

    const membershipRes = await pool.query(
      `SELECT m.*, p.name AS plan_name
       FROM memberships m JOIN plans p ON p.id = m.plan_id
       WHERE m.customer_id = $1 ORDER BY m.end_date DESC LIMIT 1`,
      [req.customerId]
    );

    const paymentRes = await pool.query(
      `SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC LIMIT 1`,
      [req.customerId]
    );

    const membership = membershipRes.rows[0];
    const statusInfo = membership ? computeMembershipStatus(membership.end_date) : null;

    return res.status(200).json({
      success: true,
      dashboard: {
        customer: {
          name: customer.name,
          photoUrl: customer.photo_url,
        },
        membership: membership
          ? {
              planName: membership.plan_name,
              startDate: membership.start_date,
              endDate: membership.end_date,
              status: statusInfo.status,
              daysRemaining: statusInfo.daysRemaining,
            }
          : null,
        latestPayment: paymentRes.rows[0]
          ? {
              amount: Number(paymentRes.rows[0].amount),
              status: paymentRes.rows[0].status,
              paymentDate: paymentRes.rows[0].payment_date,
            }
          : null,
        gym: {
          name: owner.rows[0]?.gym_name,
          phone: owner.rows[0]?.phone,
          upiId: owner.rows[0]?.upi_id,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo file is required' });
    }

    const photoUrl = `/uploads/customers/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE customers SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [photoUrl, req.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = result.rows[0];
    return res.status(200).json({
      success: true,
      profile: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        photoUrl: customer.photo_url,
        accountStatus: customer.account_status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
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
};
