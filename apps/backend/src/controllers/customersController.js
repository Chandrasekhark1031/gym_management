const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { computeMembershipStatus } = require('../utils/membershipStatus');
const { getCustomerForOwner } = require('../utils/ownership');
const { isEmail, isValidPhone, isStrongPassword } = require('../utils/validators');

const formatCustomerRow = (row) => {
  const membershipStatus = row.end_date ? computeMembershipStatus(row.end_date) : null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    photoUrl: row.photo_url,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentPlan: row.plan_name || null,
    membershipStatus: membershipStatus?.status || 'NO_MEMBERSHIP',
    expiryDate: row.end_date || null,
    daysRemaining: membershipStatus?.daysRemaining ?? null,
    hasLogin: Boolean(row.password_hash),
  };
};

const listCustomers = async (req, res, next) => {
  try {
    const { search, filter } = req.query;
    const params = [req.ownerId];
    let where = 'c.owner_id = $1';
    let paramIndex = 2;

    if (search) {
      where += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    const result = await pool.query(
      `SELECT c.*, lm.plan_name, lm.end_date
       FROM customers c
       LEFT JOIN LATERAL (
         SELECT m.end_date, p.name AS plan_name
         FROM memberships m
         JOIN plans p ON p.id = m.plan_id
         WHERE m.customer_id = c.id
         ORDER BY m.end_date DESC
         LIMIT 1
       ) lm ON TRUE
       WHERE ${where}
       ORDER BY c.created_at DESC`,
      params
    );

    let customers = result.rows.map(formatCustomerRow);

    if (filter) {
      customers = customers.filter((customer) => {
        switch (filter) {
          case 'ACTIVE':
            return customer.membershipStatus === 'ACTIVE';
          case 'EXPIRING_SOON':
            return customer.membershipStatus === 'EXPIRING_SOON';
          case 'EXPIRED':
            return customer.membershipStatus === 'EXPIRED';
          case 'NO_ACTIVE_MEMBERSHIP':
            return customer.membershipStatus === 'NO_MEMBERSHIP' || customer.membershipStatus === 'EXPIRED';
          case 'ACTIVE_ACCOUNT':
            return customer.accountStatus === 'ACTIVE';
          case 'INACTIVE_ACCOUNT':
            return customer.accountStatus === 'INACTIVE';
          default:
            return true;
        }
      });
    }

    return res.status(200).json({ success: true, customers });
  } catch (error) {
    return next(error);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await getCustomerForOwner(req.params.id, req.ownerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const memberships = await pool.query(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM memberships m
       JOIN plans p ON p.id = m.plan_id
       WHERE m.customer_id = $1
       ORDER BY m.start_date DESC`,
      [customer.id]
    );

    const payments = await pool.query(
      `SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC`,
      [customer.id]
    );

    const latestMembership = memberships.rows[0];
    const formatted = formatCustomerRow({
      ...customer,
      plan_name: latestMembership?.plan_name,
      end_date: latestMembership?.end_date,
    });

    return res.status(200).json({
      success: true,
      customer: formatted,
      memberships: memberships.rows.map((m) => ({
        ...m,
        ...computeMembershipStatus(m.end_date),
      })),
      payments: payments.rows,
    });
  } catch (error) {
    return next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, photoUrl, password, accountStatus } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    if (email && !isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    if (password && !isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with letters and numbers' });
    }

    const duplicate = await pool.query(
      'SELECT id FROM customers WHERE owner_id = $1 AND phone = $2',
      [req.ownerId, phone.trim()]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const id = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO customers (id, owner_id, name, phone, email, address, photo_url, password_hash, account_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        id,
        req.ownerId,
        name.trim(),
        phone.trim(),
        email ? email.trim().toLowerCase() : null,
        address || null,
        photoUrl || null,
        passwordHash,
        accountStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      ]
    );

    return res.status(201).json({ success: true, customer: formatCustomerRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await getCustomerForOwner(req.params.id, req.ownerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { name, phone, email, address, photoUrl, password, accountStatus } = req.body;
    let passwordHash = customer.password_hash;
    if (password) {
      if (!isStrongPassword(password)) {
        return res.status(400).json({ success: false, message: 'Invalid password format' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           address = COALESCE($4, address),
           photo_url = COALESCE($5, photo_url),
           password_hash = $6,
           account_status = COALESCE($7, account_status),
           updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [
        name || null,
        phone || null,
        email ? email.toLowerCase() : null,
        address || null,
        photoUrl || null,
        passwordHash,
        accountStatus || null,
        req.params.id,
        req.ownerId,
      ]
    );

    return res.status(200).json({ success: true, customer: formatCustomerRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const updateCustomerStatus = async (req, res, next) => {
  try {
    const accountStatus = req.body.accountStatus || req.body.status;
    if (!['ACTIVE', 'INACTIVE'].includes(accountStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid account status' });
    }

    const result = await pool.query(
      `UPDATE customers SET account_status = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [accountStatus, req.params.id, req.ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.status(200).json({ success: true, customer: formatCustomerRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await getCustomerForOwner(req.params.id, req.ownerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const deps = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM memberships WHERE customer_id = $1) AS memberships,
         (SELECT COUNT(*) FROM payments WHERE customer_id = $1) AS payments`,
      [req.params.id]
    );

    if (Number(deps.rows[0].memberships) > 0 || Number(deps.rows[0].payments) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with membership or payment history. Deactivate instead.',
      });
    }

    await pool.query('DELETE FROM customers WHERE id = $1 AND owner_id = $2', [req.params.id, req.ownerId]);
    return res.status(200).json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    return next(error);
  }
};

const uploadCustomerPhoto = async (req, res, next) => {
  try {
    const customer = await getCustomerForOwner(req.params.id, req.ownerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo file is required' });
    }

    const photoUrl = `/uploads/customers/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE customers SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [photoUrl, req.params.id]
    );

    return res.status(200).json({ success: true, customer: formatCustomerRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
  uploadCustomerPhoto,
};
