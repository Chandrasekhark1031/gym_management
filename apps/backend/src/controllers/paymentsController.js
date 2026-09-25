const crypto = require('crypto');
const pool = require('../config/database');
const { getCustomerForOwner, getPaymentForOwner, getMembershipForOwner } = require('../utils/ownership');

const ALLOWED_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER', 'OFFLINE'];
const ALLOWED_STATUS = ['PAID', 'PENDING', 'FAILED'];

const formatPayment = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer_name,
  membershipId: row.membership_id,
  membershipPlanName: row.membership_plan_name || null,
  amount: Number(row.amount),
  paymentDate: row.payment_date,
  paymentMethod: row.payment_method,
  status: row.status,
  notes: row.notes,
});

const listPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS customer_name, pl.name AS membership_plan_name
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN memberships m ON m.id = p.membership_id
       LEFT JOIN plans pl ON pl.id = m.plan_id
       WHERE c.owner_id = $1
       ORDER BY p.payment_date DESC`,
      [req.ownerId]
    );
    return res.status(200).json({ success: true, payments: result.rows.map(formatPayment) });
  } catch (error) {
    return next(error);
  }
};

const getPayment = async (req, res, next) => {
  try {
    const payment = await getPaymentForOwner(req.params.id, req.ownerId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const details = await pool.query(
      `SELECT p.*, c.name AS customer_name, pl.name AS membership_plan_name
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN memberships m ON m.id = p.membership_id
       LEFT JOIN plans pl ON pl.id = m.plan_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    return res.status(200).json({ success: true, payment: formatPayment(details.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const { customerId, membershipId, amount, paymentDate, paymentMethod, status, notes } = req.body;
    if (!customerId || amount === undefined || !paymentMethod || !status) {
      return res.status(400).json({ success: false, message: 'Required payment fields missing' });
    }
    if (!ALLOWED_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const customer = await getCustomerForOwner(customerId, req.ownerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (membershipId) {
      const membership = await getMembershipForOwner(membershipId, req.ownerId);
      if (!membership || membership.customer_id !== customerId) {
        return res.status(400).json({ success: false, message: 'Invalid membership for customer' });
      }
    }

    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO payments (id, customer_id, membership_id, amount, payment_date, payment_method, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        customerId,
        membershipId || null,
        amount,
        paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        status,
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      payment: formatPayment({ ...result.rows[0], customer_name: customer.name }),
    });
  } catch (error) {
    return next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const payment = await getPaymentForOwner(req.params.id, req.ownerId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const { amount, paymentDate, paymentMethod, status, notes, membershipId } = req.body;
    if (paymentMethod && !ALLOWED_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
    if (status && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const result = await pool.query(
      `UPDATE payments
       SET amount = COALESCE($1, amount),
           payment_date = COALESCE($2, payment_date),
           payment_method = COALESCE($3, payment_method),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           membership_id = COALESCE($6, membership_id)
       WHERE id = $7
       RETURNING *`,
      [
        amount ?? null,
        paymentDate ? new Date(paymentDate) : null,
        paymentMethod || null,
        status || null,
        notes || null,
        membershipId || null,
        req.params.id,
      ]
    );

    const details = await pool.query(
      `SELECT p.*, c.name AS customer_name, pl.name AS membership_plan_name
       FROM payments p
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN memberships m ON m.id = p.membership_id
       LEFT JOIN plans pl ON pl.id = m.plan_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    return res.status(200).json({ success: true, payment: formatPayment(details.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
};
