const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateCustomerToken } = require('../utils/jwt');
const { isEmail, normalizePhone, isValidPhone, isStrongPassword } = require('../utils/validators');

const getRegistrationOwnerId = async () => {
  const result = await pool.query('SELECT id FROM gym_owners ORDER BY created_at ASC LIMIT 1');
  return result.rows[0]?.id || null;
};

const findCustomerByEmailOrPhone = async (email, phone) => {
  const phoneDigits = normalizePhone(phone);
  const result = await pool.query(
    `SELECT id FROM customers
     WHERE LOWER(email) = LOWER($1)
        OR phone = $2
        OR regexp_replace(phone, '[^0-9]', '', 'g') = $3`,
    [email.trim().toLowerCase(), phone.trim(), phoneDigits]
  );
  return result.rows[0] || null;
};

const findCustomerByIdentifier = async (identifier) => {
  const trimmed = identifier.trim();
  if (isEmail(trimmed)) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
      [trimmed]
    );
    return result.rows[0];
  }

  const phoneDigits = normalizePhone(trimmed);
  if (!isValidPhone(trimmed)) {
    return null;
  }

  const result = await pool.query(
    `SELECT * FROM customers
     WHERE phone = $1 OR regexp_replace(phone, '[^0-9]', '', 'g') = $2`,
    [trimmed, phoneDigits]
  );
  return result.rows[0];
};

const formatCustomer = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  photoUrl: row.photo_url,
  accountStatus: row.account_status,
  role: 'CUSTOMER',
});

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const customer = await findCustomerByIdentifier(identifier);
    if (!customer || !customer.password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (customer.account_status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const isMatch = await bcrypt.compare(password, customer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateCustomerToken(customer.id, customer.owner_id);
    const ownerRes = await pool.query('SELECT gym_name, photo_url FROM gym_owners WHERE id = $1', [customer.owner_id]);
    const gym = ownerRes.rows[0];

    return res.status(200).json({
      success: true,
      token,
      user: {
        ...formatCustomer(customer),
        gymName: gym?.gym_name || null,
        gymLogoUrl: gym?.photo_url || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, o.gym_name, o.photo_url AS gym_logo_url
       FROM customers c
       LEFT JOIN gym_owners o ON o.id = c.owner_id
       WHERE c.id = $1`,
      [req.customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      user: {
        ...formatCustomer(row),
        gymName: row.gym_name || null,
        gymLogoUrl: row.gym_logo_url || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, phone, address, password, confirmPassword } = req.body;

    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include letters and numbers',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const ownerId = await getRegistrationOwnerId();
    if (!ownerId) {
      return res.status(503).json({ success: false, message: 'Customer registration is unavailable right now' });
    }

    const duplicate = await findCustomerByEmailOrPhone(email, phone);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Email or phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customerId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO customers (
        id, owner_id, name, email, phone, address, password_hash,
        email_verified, account_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 'ACTIVE', NOW(), NOW())`,
      [
        customerId,
        ownerId,
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        address || null,
        passwordHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful. You can now login.',
      customer: {
        id: customerId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with letters and numbers' });
    }

    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.customerId]);
    const customer = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, customer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, req.customerId]
    );

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
};
