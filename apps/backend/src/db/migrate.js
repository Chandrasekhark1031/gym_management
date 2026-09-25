const pool = require('../config/database');

async function migrate() {
  await pool.query(`
    ALTER TABLE gym_owners
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS gym_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bank_candidate_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id UUID PRIMARY KEY,
      owner_id UUID NOT NULL REFERENCES gym_owners(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_otps_owner_id
      ON password_reset_otps(owner_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at
      ON password_reset_otps(expires_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_otps (
      id UUID PRIMARY KEY,
      owner_id UUID NOT NULL REFERENCES gym_owners(id) ON DELETE CASCADE,
      new_email VARCHAR(255) NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_otps_owner_id
      ON email_verification_otps(owner_id);
  `);

  await pool.query(`
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS duration_value INTEGER,
      ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'Days',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
  `);

  await pool.query(`
    UPDATE plans
    SET duration_value = duration_days,
        duration_unit = 'Days'
    WHERE duration_value IS NULL;
  `);

  await pool.query(`
    ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES gym_owners(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);
  `);

  await pool.query(`
    UPDATE notifications n
    SET owner_id = c.owner_id
    FROM customers c
    WHERE n.customer_id = c.id AND n.owner_id IS NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_plans_owner_id ON plans(owner_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_memberships_customer_id ON memberships(customer_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_owner_id ON notifications(owner_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
  `);
}

module.exports = { migrate };
