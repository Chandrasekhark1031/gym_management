const pool = require('../config/database');

const getCustomerForOwner = async (customerId, ownerId) => {
  const result = await pool.query(
    'SELECT * FROM customers WHERE id = $1 AND owner_id = $2',
    [customerId, ownerId]
  );
  return result.rows[0] || null;
};

const getPlanForOwner = async (planId, ownerId) => {
  const result = await pool.query(
    'SELECT * FROM plans WHERE id = $1 AND owner_id = $2',
    [planId, ownerId]
  );
  return result.rows[0] || null;
};

const getMembershipForOwner = async (membershipId, ownerId) => {
  const result = await pool.query(
    `SELECT m.* FROM memberships m
     INNER JOIN customers c ON c.id = m.customer_id
     WHERE m.id = $1 AND c.owner_id = $2`,
    [membershipId, ownerId]
  );
  return result.rows[0] || null;
};

const getPaymentForOwner = async (paymentId, ownerId) => {
  const result = await pool.query(
    `SELECT p.* FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     WHERE p.id = $1 AND c.owner_id = $2`,
    [paymentId, ownerId]
  );
  return result.rows[0] || null;
};

module.exports = {
  getCustomerForOwner,
  getPlanForOwner,
  getMembershipForOwner,
  getPaymentForOwner,
};
