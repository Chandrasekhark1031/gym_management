/**
 * Owner A/B and Customer A/B isolation checks.
 * Requires local API + PostgreSQL. Creates a second gym owner for cross-tenant tests.
 */
require('../src/config/env');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function req(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function ensureOwnerB() {
  const email = 'ownerb-isolation@test.com';
  const phone = '8888888881';
  const existing = await pool.query('SELECT id FROM gym_owners WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash('OwnerBPass123', 10);
  await pool.query(
    `INSERT INTO gym_owners (id, name, email, phone, password_hash, gym_name, email_verified, phone_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, NOW(), NOW())`,
    [id, 'Owner B', email, phone, hash, 'Gym B']
  );
  return id;
}

async function main() {
  let passed = 0;
  let failed = 0;
  const assert = (n, o, d) => { if (check(n, o, d)) passed += 1; else failed += 1; };

  await ensureOwnerB();

  const ownerA = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner@test.com', password: 'password123' }),
  });
  const ownerB = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'ownerb-isolation@test.com', password: 'OwnerBPass123' }),
  });
  assert('Owner A login', ownerA.status === 200 && ownerA.body.token);
  assert('Owner B login', ownerB.status === 200 && ownerB.body.token);
  const tokenA = ownerA.body.token;
  const tokenB = ownerB.body.token;

  const ts = Date.now();
  const custA = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Iso Customer A', phone: `7${String(ts).slice(-9)}`, password: 'Pass1234' }),
  });
  const custB = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'Iso Customer B', phone: `6${String(ts).slice(-9)}`, password: 'Pass1234' }),
  });
  const idA = custA.body.customer?.id;
  const idB = custB.body.customer?.id;
  assert('Create customer under A', custA.status === 201);
  assert('Create customer under B', custB.status === 201);

  const aGetsB = await req(`/customers/${idB}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const bGetsA = await req(`/customers/${idA}`, { headers: { Authorization: `Bearer ${tokenB}` } });
  assert('Owner A cannot read Owner B customer', aGetsB.status === 404 || aGetsB.status === 403, String(aGetsB.status));
  assert('Owner B cannot read Owner A customer', bGetsA.status === 404 || bGetsA.status === 403, String(bGetsA.status));

  const loginA = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: custA.body.customer.phone, password: 'Pass1234' }),
  });
  const loginB = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: custB.body.customer.phone, password: 'Pass1234' }),
  });
  const jwtA = loginA.body.token;
  const jwtB = loginB.body.token;
  assert('Customer A login', loginA.status === 200);
  assert('Customer B login', loginB.status === 200);

  const aProfileOk = await req('/customer/profile', { headers: { Authorization: `Bearer ${jwtA}` } });
  assert('Customer A reads own profile', aProfileOk.status === 200);

  // Customer tokens must not access owner APIs
  const custOwnerApi = await req('/customers', { headers: { Authorization: `Bearer ${jwtA}` } });
  assert('Customer A blocked from owner customers', custOwnerApi.status === 403);

  console.log(`\nIsolation summary: ${passed} passed, ${failed} failed`);
  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
