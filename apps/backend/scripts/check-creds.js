const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function main() {
  const cust = await pool.query('SELECT name, phone, email, password_hash FROM customers WHERE phone LIKE $1', ['%6303803353%']);
  if (cust.rows.length > 0 && cust.rows[0].password_hash) {
    const candidates = [
      'pavan123', 'pavan@123', '123456', 'password', 'password123', 'Pass1234',
      'Chandra@123', '6303803353', 'Pavan@123', 'Pavan123', 'admin123', '12345678'
    ];
    for (const p of candidates) {
      if (await bcrypt.compare(p, cust.rows[0].password_hash)) {
        console.log('Customer pavan password MATCH FOUND:', p);
        await pool.end();
        return;
      }
    }
    console.log('None of the common candidates matched customer password.');
  }
  await pool.end();
}

main().catch(console.error);
