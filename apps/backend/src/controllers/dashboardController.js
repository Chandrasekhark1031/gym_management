const pool = require('../config/database');
const { computeMembershipStatus } = require('../utils/membershipStatus');

const getOwnerStats = async (req, res, next) => {
  try {
    const ownerId = req.ownerId;

    const [customers, memberships, plans, payments, pendingPayments] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM customers WHERE owner_id = $1', [ownerId]),
      pool.query(
        `SELECT m.end_date FROM memberships m
         JOIN customers c ON c.id = m.customer_id
         WHERE c.owner_id = $1`,
        [ownerId]
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM plans WHERE owner_id = $1 AND is_active = TRUE', [ownerId]),
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(p.amount), 0) AS total_amount
         FROM payments p
         JOIN customers c ON c.id = p.customer_id
         WHERE c.owner_id = $1`,
        [ownerId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM payments p
         JOIN customers c ON c.id = p.customer_id
         WHERE c.owner_id = $1 AND p.status = 'PENDING'`,
        [ownerId]
      ),
    ]);

    let activeMemberships = 0;
    let expiringWithin7 = 0;
    let expiredMemberships = 0;

    for (const row of memberships.rows) {
      const { status } = computeMembershipStatus(row.end_date);
      if (status === 'ACTIVE') activeMemberships += 1;
      if (status === 'EXPIRING_SOON') expiringWithin7 += 1;
      if (status === 'EXPIRED') expiredMemberships += 1;
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalCustomers: customers.rows[0].count,
        activeMemberships,
        expiringWithin7Days: expiringWithin7,
        expiredMemberships,
        activePlans: plans.rows[0].count,
        totalPayments: payments.rows[0].count,
        totalPaymentAmount: Number(payments.rows[0].total_amount),
        pendingVerifications: pendingPayments.rows[0].count,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getExpiringMemberships = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.end_date, c.name AS customer_name, c.phone AS customer_phone, p.name AS plan_name
       FROM memberships m
       JOIN customers c ON c.id = m.customer_id
       JOIN plans p ON p.id = m.plan_id
       WHERE c.owner_id = $1`,
      [req.ownerId]
    );

    const memberships = result.rows
      .map((row) => {
        const statusInfo = computeMembershipStatus(row.end_date);
        return {
          customerName: row.customer_name,
          phone: row.customer_phone,
          planName: row.plan_name,
          expiryDate: row.end_date,
          daysRemaining: statusInfo.daysRemaining,
          status: statusInfo.status,
        };
      })
      .filter((m) => m.status === 'EXPIRING_SOON')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return res.status(200).json({ success: true, memberships });
  } catch (error) {
    return next(error);
  }
};

const getRecentPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.amount, p.payment_date, p.payment_method, p.status, c.name AS customer_name
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       WHERE c.owner_id = $1
       ORDER BY p.payment_date DESC
       LIMIT 10`,
      [req.ownerId]
    );

    return res.status(200).json({
      success: true,
      payments: result.rows.map((row) => ({
        customerName: row.customer_name,
        amount: Number(row.amount),
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        status: row.status,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOwnerStats,
  getExpiringMemberships,
  getRecentPayments,
};
