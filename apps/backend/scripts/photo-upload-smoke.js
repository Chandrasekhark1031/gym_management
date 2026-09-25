/**
 * Photo upload API smoke (owner + customer) using a tiny PNG buffer.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function reqJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function uploadPhoto(path, token, fieldName = 'photo') {
  const form = new FormData();
  form.append(fieldName, new Blob([PNG_1X1], { type: 'image/png' }), 'test.png');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
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

async function main() {
  let passed = 0;
  let failed = 0;
  const assert = (n, o, d) => { if (check(n, o, d)) passed += 1; else failed += 1; };

  const ownerLogin = await reqJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'owner@test.com', password: 'password123' }),
  });
  const ownerToken = ownerLogin.body.token;

  const ts = Date.now();
  const customer = await reqJson('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ name: 'Photo Test', phone: `5${String(ts).slice(-9)}`, password: 'Pass1234' }),
  });
  const customerId = customer.body.customer?.id;
  assert('Create customer for photo test', customer.status === 201);

  const ownerUpload = await uploadPhoto(`/customers/${customerId}/photo`, ownerToken);
  assert('Owner uploads customer photo', ownerUpload.status === 200 && ownerUpload.body.customer?.photoUrl);

  const custLogin = await reqJson('/customer/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: customer.body.customer.phone, password: 'Pass1234' }),
  });
  const custToken = custLogin.body.token;

  const selfUpload = await uploadPhoto('/customer/profile/photo', custToken);
  assert('Customer uploads own photo', selfUpload.status === 200 && selfUpload.body.profile?.photoUrl);

  const badUpload = await uploadPhoto(`/customers/${customerId}/photo`, custToken);
  assert('Customer blocked from owner photo route', badUpload.status === 403 || badUpload.status === 401, String(badUpload.status));

  console.log(`\nPhoto upload summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
