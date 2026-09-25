const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { defaultAdmin } = require('../config/env');

async function seedDefaultAdmin() {
  if (!defaultAdmin.email || !defaultAdmin.phone || !defaultAdmin.password) {
    console.warn('Default admin seed skipped: DEFAULT_ADMIN_* env vars not fully configured.');
    return;
  }

  const existing = await pool.query('SELECT id FROM gym_owners LIMIT 1');
  if (existing.rows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(defaultAdmin.password, 10);
  const id = crypto.randomUUID();

  await pool.query(
    `INSERT INTO gym_owners (
      id, name, email, phone, password_hash, gym_name,
      email_verified, phone_verified, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, NOW(), NOW())`,
    [
      id,
      defaultAdmin.name,
      defaultAdmin.email.toLowerCase(),
      defaultAdmin.phone,
      passwordHash,
      defaultAdmin.gymName || 'Gym Manager',
    ]
  );

  console.log('Default admin account created from environment configuration.');
}

module.exports = { seedDefaultAdmin };
