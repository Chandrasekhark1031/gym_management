/**
 * Extended smoke/audit checks against local API (http://localhost:5000).
 * Run: node scripts/audit-smoke.js
 */
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

function assert(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function main() {
  let passed = 0;
  let failed = 0;
  const check = (n, o, d) => { if (assert(n, o, d)) passed += 1; else failed += 1; };

  const health = await req('/health');
  check('API health', health.status === 200, String(health.status));

  const badLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner@test.com', password: 'wrong-password-xyz' }),
  });
  check('Owner invalid password rejected', badLogin.status === 401);

  const ownerLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner@test.com', password: 'password123' }),
  });
  check('Owner login email', ownerLogin.status === 200 && ownerLogin.body.success, String(ownerLogin.status));
  const ownerToken = ownerLogin.body.token;

  const ownerMe = await req('/auth/me', { headers: { Authorization: `Bearer ${ownerToken}` } });
  check('Owner /auth/me', ownerMe.status === 200);
  check('No password_hash in owner me', !JSON.stringify(ownerMe.body).includes('password_hash'));

  const stats = await req('/dashboard/stats', { headers: { Authorization: `Bearer ${ownerToken}` } });
  check('Dashboard stats', stats.status === 200 && stats.body.stats);

  const phone = ownerMe.body.user?.phone;
  if (phone) {
    const phoneLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: phone, password: 'password123' }),
    });
    check('Owner login phone', phoneLogin.status === 200 && phoneLogin.body.success);
  } else {
    check('Owner login phone', false, 'no phone on seed owner');
  }

  const unique = Date.now();
  const customer = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Audit Customer',
      phone: `9${unique.toString().slice(-9)}`,
      email: `audit${unique}@test.com`,
      password: 'Pass1234',
    }),
  });
  check('Create customer', customer.status === 201, String(customer.status));
  const customerId = customer.body.customer?.id;

  const registerPhone = `8${(unique + 1).toString().slice(-9)}`;
  const reg = await req('/customer/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Self Reg Customer',
      email: `self${unique}@test.com`,
      phone: registerPhone,
      password: 'Pass1234',
      confirmPassword: 'Pass1234',
    }),
  });
  check('Customer registration', reg.status === 201, String(reg.status));

  const custLoginEmail = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: `audit${unique}@test.com`, password: 'Pass1234' }),
  });
  check('Customer login email', custLoginEmail.status === 200, String(custLoginEmail.status));
  const customerToken = custLoginEmail.body.token;

  const custLoginPhone = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: customer.body.customer.phone, password: 'Pass1234' }),
  });
  check('Customer login phone', custLoginPhone.status === 200);

  const blocked = await req('/customers', { headers: { Authorization: `Bearer ${customerToken}` } });
  check('Customer blocked from owner API', blocked.status === 403, String(blocked.status));

  const dash = await req('/customer/dashboard', { headers: { Authorization: `Bearer ${customerToken}` } });
  check('Customer dashboard', dash.status === 200);

  const selfRegLogin = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: registerPhone, password: 'Pass1234' }),
  });
  check('Self-reg customer login', selfRegLogin.status === 200);
  const selfToken = selfRegLogin.body.token;
  const selfDash = await req('/customer/dashboard', { headers: { Authorization: `Bearer ${selfToken}` } });
  check('Self-reg no membership empty', selfDash.status === 200 && !selfDash.body.dashboard?.membership);

  const plan = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ name: `Audit Plan ${unique}`, durationValue: 1, durationUnit: 'Months', price: 500 }),
  });
  check('Create plan', plan.status === 201);
  const planId = plan.body.plan?.id;

  await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ customerId, planId }),
  });
  const dashAfter = await req('/customer/dashboard', { headers: { Authorization: `Bearer ${customerToken}` } });
  check('Customer sees membership after assign', !!dashAfter.body.dashboard?.membership);

  const payment = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ customerId, amount: 500, paymentMethod: 'CASH', status: 'PAID', notes: 'audit' }),
  });
  check('Create payment', payment.status === 201);

  const notif = await req('/notifications', { headers: { Authorization: `Bearer ${ownerToken}` } });
  check('Owner notifications list', notif.status === 200);

  const custNotif = await req('/customer/notifications', { headers: { Authorization: `Bearer ${customerToken}` } });
  check('Customer notifications', custNotif.status === 200);

  const upi = await req('/customer/gym-payment', { headers: { Authorization: `Bearer ${customerToken}` } });
  check('Customer gym UPI', upi.status === 200);

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
