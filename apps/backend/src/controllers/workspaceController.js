const crypto = require('crypto');
const pool = require('../config/database');
const { getCustomerForOwner } = require('../utils/ownership');
const METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER', 'OFFLINE'];

// Reminders appear in the customer's portal; this does not send SMS or email.
const remindMembership = async (req, res, next) => {
  try {
    const customer = await getCustomerForOwner(req.body.customerId, req.ownerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const result = await pool.query(
      `SELECT m.end_date, p.name FROM memberships m JOIN plans p ON p.id = m.plan_id
       WHERE m.customer_id = $1 ORDER BY m.end_date DESC LIMIT 1`, [customer.id]);
    if (!result.rows.length) return res.status(400).json({ success: false, message: 'No membership found' });
    const membership = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (id, owner_id, customer_id, title, message, is_read, notification_type, created_at)
       VALUES ($1,$2,$3,$4,$5,FALSE,'CUSTOMER_RENEWAL',NOW())`,
      [crypto.randomUUID(), req.ownerId, customer.id, 'Membership renewal reminder',
       `Your ${membership.name} membership ends on ${new Date(membership.end_date).toLocaleDateString('en-IN')}. Please contact your gym owner to renew.`]);
    return res.json({ success: true });
  } catch (error) { return next(error); }
};

const reportPayment = async (req, res, next) => {
  const { membershipId, amount, paymentMethod, notes } = req.body;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 10000000 || !METHODS.includes(paymentMethod))
    return res.status(400).json({ success: false, message: 'Enter a valid payment amount and method.' });
  if (typeof notes !== 'string' || notes.length > 1000)
    return res.status(400).json({ success: false, message: 'Enter a note under 1000 characters.' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const customer = (await client.query('SELECT id,owner_id,name FROM customers WHERE id=$1', [req.customerId])).rows[0];
    if (!customer) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Customer not found' }); }
    if (membershipId) {
      const membership = await client.query('SELECT id FROM memberships WHERE id=$1 AND customer_id=$2', [membershipId, req.customerId]);
      if (!membership.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Membership must belong to this customer.' }); }
    }
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO payments (id,customer_id,membership_id,amount,payment_date,payment_method,status,notes)
       VALUES ($1,$2,$3,$4,NOW(),$5,'PENDING',$6)`,
      [id, req.customerId, membershipId || null, Math.round(numeric * 100) / 100, paymentMethod, notes]);
    await client.query(
      `INSERT INTO notifications (id,owner_id,customer_id,title,message,is_read,notification_type,created_at)
       VALUES ($1,$2,$3,'Payment reported',$4,FALSE,'PAYMENT',NOW())`,
      [crypto.randomUUID(), customer.owner_id, customer.id, `${customer.name} reported a ${paymentMethod} payment of ₹${numeric}. Verify it after checking the payment.`]);
    await client.query('COMMIT');
    return res.status(201).json({ success: true, payment: { id, status: 'PENDING' } });
  } catch (error) { if (client) await client.query('ROLLBACK'); return next(error); }
  finally { if (client) client.release(); }
};
module.exports = { remindMembership, reportPayment };
