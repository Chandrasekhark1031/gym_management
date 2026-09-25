const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const BASE_URL = 'http://localhost:5000/api';

async function req(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

let passed = 0;
let failed = 0;
const testLog = [];

function record(name, condition, classification = 'IMPLEMENTED + TESTED', detail = '') {
  const ok = Boolean(condition);
  if (ok) {
    passed += 1;
    console.log(`[PASS] [${classification}] ${name}${detail ? ` — ${detail}` : ''}`);
    testLog.push({ name, status: 'PASS', classification, detail });
  } else {
    failed += 1;
    console.error(`[FAIL] [${classification}] ${name}${detail ? ` — ${detail}` : ''}`);
    testLog.push({ name, status: 'FAIL', classification, detail });
  }
  return ok;
}

async function ensureOwner(name, email, phone, password, gymName) {
  const existing = await pool.query('SELECT id FROM gym_owners WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO gym_owners (id, name, email, phone, password_hash, gym_name, email_verified, phone_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, NOW(), NOW())`,
    [id, name, email.toLowerCase(), phone, hash, gymName]
  );
  return id;
}

async function runDeepVerification() {
  console.log('====================================================');
  console.log('STARTING DEEP INDEPENDENT VERIFICATION & REGRESSION');
  console.log('====================================================\n');

  // Setup Owners
  const ownerAId = await ensureOwner('Deep Owner A', 'deep_owner_a@test.com', '9300000001', 'PassOwnerA123', 'Deep Gym A');
  const ownerBId = await ensureOwner('Deep Owner B', 'deep_owner_b@test.com', '9300000002', 'PassOwnerB123', 'Deep Gym B');

  // Login Owner A
  const loginA = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'deep_owner_a@test.com', password: 'PassOwnerA123' }),
  });
  record('Owner A login via email', loginA.status === 200 && loginA.body.token);
  const tokenA = loginA.body?.token;

  // Login Owner B
  const loginB = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'deep_owner_b@test.com', password: 'PassOwnerB123' }),
  });
  record('Owner B login via email', loginB.status === 200 && loginB.body.token);
  const tokenB = loginB.body?.token;

  // 1. VERIFY PREVIOUS FIXES
  // Fix C: Customer Status toggle ({ accountStatus } vs { status })
  const ts = Date.now();
  const custARes = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Deep Cust A',
      phone: `93${String(ts).slice(-8)}`,
      email: `deep_cust_a_${ts}@test.com`,
      password: 'CustPass123',
    }),
  });
  record('Create Customer A', custARes.status === 201 && custARes.body.customer?.id);
  const custAId = custARes.body.customer?.id;

  const toggle1 = await req(`/customers/${custAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ accountStatus: 'INACTIVE' }),
  });
  record('Toggle customer status using accountStatus field', toggle1.status === 200 && toggle1.body.customer?.accountStatus === 'INACTIVE', 'FIXED + TESTED');

  const toggle2 = await req(`/customers/${custAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  record('Toggle customer status using status alias field', toggle2.status === 200 && toggle2.body.customer?.accountStatus === 'ACTIVE', 'FIXED + TESTED');

  // Fix D: Owner Notifications & Cross-Owner Rejection
  const custBRes = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      name: 'Deep Cust B',
      phone: `94${String(ts).slice(-8)}`,
      email: `deep_cust_b_${ts}@test.com`,
      password: 'CustPass123',
    }),
  });
  const custBId = custBRes.body.customer?.id;

  // Owner A notifies Customer A (allowed)
  const notifA_A = await req('/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ customerId: custAId, title: 'Alert A', message: 'Hello A' }),
  });
  record('Owner A notifies Customer A (valid)', notifA_A.status === 201, 'FIXED + TESTED');

  // Owner A attempts to notify Customer B (cross-owner - MUST FAIL)
  const notifA_B = await req('/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ customerId: custBId, title: 'Cross Alert', message: 'Unauthorized' }),
  });
  record('Owner A blocked from notifying Owner B customer (cross-owner rejected)', notifA_B.status === 404 || notifA_B.status === 403, 'FIXED + TESTED', `Status ${notifA_B.status}`);

  // Owner B attempts to notify Customer A (cross-owner - MUST FAIL)
  const notifB_A = await req('/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ customerId: custAId, title: 'Cross Alert 2', message: 'Unauthorized' }),
  });
  record('Owner B blocked from notifying Owner A customer (cross-owner rejected)', notifB_A.status === 404 || notifB_A.status === 403, 'FIXED + TESTED', `Status ${notifB_A.status}`);

  // 2. DEEP OWNER ISOLATION TESTS
  // Plans
  const planARes = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Plan A', durationValue: 1, durationUnit: 'Months', price: 1000 }),
  });
  const planAId = planARes.body.plan?.id;

  const planBRes = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'Plan B', durationValue: 2, durationUnit: 'Months', price: 2000 }),
  });
  const planBId = planBRes.body.plan?.id;

  // Owner A operations on Owner B Plan
  const getPlanB = await req(`/plans/${planBId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const updatePlanB = await req(`/plans/${planBId}`, { method: 'PUT', headers: { Authorization: `Bearer ${tokenA}` }, body: JSON.stringify({ name: 'Hacked' }) });
  const deletePlanB = await req(`/plans/${planBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  record('Owner A cannot read Owner B plan', getPlanB.status === 404 || getPlanB.status === 403);
  record('Owner A cannot update Owner B plan', updatePlanB.status === 404 || updatePlanB.status === 403);
  record('Owner A cannot delete Owner B plan', deletePlanB.status === 404 || deletePlanB.status === 403);

  // Owner A operations on Owner B Customer
  const getCustB = await req(`/customers/${custBId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const updateCustB = await req(`/customers/${custBId}`, { method: 'PUT', headers: { Authorization: `Bearer ${tokenA}` }, body: JSON.stringify({ name: 'Hacked Cust' }) });
  const deleteCustB = await req(`/customers/${custBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  record('Owner A cannot read Owner B customer', getCustB.status === 404 || getCustB.status === 403);
  record('Owner A cannot update Owner B customer', updateCustB.status === 404 || updateCustB.status === 403);
  record('Owner A cannot delete Owner B customer', deleteCustB.status === 404 || deleteCustB.status === 403);

  // Memberships
  const membBRes = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ customerId: custBId, planId: planBId, startDate: '2026-09-21' }),
  });
  const membBId = membBRes.body.membership?.id;

  // Owner A operations on Owner B Membership
  const getMembB = await req(`/memberships/${membBId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const renewMembB = await req(`/memberships/${membBId}/renew`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` }, body: JSON.stringify({ planId: planAId }) });
  const deleteMembB = await req(`/memberships/${membBId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } });
  record('Owner A cannot read Owner B membership', getMembB.status === 404 || getMembB.status === 403);
  record('Owner A cannot renew Owner B membership', renewMembB.status === 404 || renewMembB.status === 403);
  record('Owner A cannot delete Owner B membership', deleteMembB.status === 404 || deleteMembB.status === 403);

  // Payments
  const payBRes = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ customerId: custBId, membershipId: membBId, amount: 2000, paymentMethod: 'CASH', status: 'PAID' }),
  });
  const payBId = payBRes.body.payment?.id;

  // Owner A operations on Owner B Payment
  const getPayB = await req(`/payments/${payBId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  const updatePayB = await req(`/payments/${payBId}`, { method: 'PUT', headers: { Authorization: `Bearer ${tokenA}` }, body: JSON.stringify({ amount: 9999 }) });
  record('Owner A cannot read Owner B payment', getPayB.status === 404 || getPayB.status === 403);
  record('Owner A cannot update Owner B payment', updatePayB.status === 404 || updatePayB.status === 403);

  // Create payment against Owner B customer
  const payCustB = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ customerId: custBId, amount: 100, paymentMethod: 'CASH', status: 'PAID' }),
  });
  record('Owner A cannot create payment for Owner B customer', payCustB.status === 404 || payCustB.status === 400);

  // Create membership using Owner B plan
  const membCrossPlan = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ customerId: custAId, planId: planBId, startDate: '2026-09-21' }),
  });
  record('Owner A cannot assign membership using Owner B plan', membCrossPlan.status === 404 || membCrossPlan.status === 400);

  // 3. DEEP CUSTOMER ISOLATION
  const custALogin = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: custARes.body.customer.phone, password: 'CustPass123' }),
  });
  const tokenCustA = custALogin.body?.token;

  const custBLogin = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: custBRes.body.customer.phone, password: 'CustPass123' }),
  });
  const tokenCustB = custBLogin.body?.token;

  // Customer A accesses own profile
  const aOwnProfile = await req('/customer/profile', { headers: { Authorization: `Bearer ${tokenCustA}` } });
  record('Customer A reads own profile', aOwnProfile.status === 200 && aOwnProfile.body.profile?.name === 'Deep Cust A');

  // Customer A cannot access owner APIs
  const aOwnerCusts = await req('/customers', { headers: { Authorization: `Bearer ${tokenCustA}` } });
  const aOwnerPlans = await req('/plans', { headers: { Authorization: `Bearer ${tokenCustA}` } });
  const aOwnerMembs = await req('/memberships', { headers: { Authorization: `Bearer ${tokenCustA}` } });
  record('Customer A blocked from /customers (403)', aOwnerCusts.status === 403);
  record('Customer A blocked from /plans (403)', aOwnerPlans.status === 403);
  record('Customer A blocked from /memberships (403)', aOwnerMembs.status === 403);

  // Customer B cannot see Customer A payments
  const bPayments = await req('/customer/payments', { headers: { Authorization: `Bearer ${tokenCustB}` } });
  const containsCustA = bPayments.body?.payments?.some((p) => p.customerId === custAId);
  record('Customer B cannot see Customer A payments', bPayments.status === 200 && !containsCustA);

  // 4. MEMBERSHIP STATUS CALCULATION (ACTIVE, EXPIRING_SOON, EXPIRED)
  const { computeMembershipStatus } = require('../src/utils/membershipStatus');
  const nowD = new Date();

  // Test 1: 15 days in future -> ACTIVE
  const future15 = new Date(nowD);
  future15.setDate(nowD.getDate() + 15);
  record('Status 15 days in future is ACTIVE', computeMembershipStatus(future15).status === 'ACTIVE');

  // Test 2: 7 days in future -> EXPIRING_SOON
  const future7 = new Date(nowD);
  future7.setDate(nowD.getDate() + 7);
  record('Status 7 days in future is EXPIRING_SOON', computeMembershipStatus(future7).status === 'EXPIRING_SOON');

  // Test 3: Tomorrow (1 day) -> EXPIRING_SOON
  const future1 = new Date(nowD);
  future1.setDate(nowD.getDate() + 1);
  record('Status tomorrow is EXPIRING_SOON', computeMembershipStatus(future1).status === 'EXPIRING_SOON');

  // Test 4: Today (0 days) -> EXPIRING_SOON
  const todayD = new Date(nowD);
  record('Status today is EXPIRING_SOON', computeMembershipStatus(todayD).status === 'EXPIRING_SOON');

  // Test 5: Yesterday (-1 day) -> EXPIRED
  const past1 = new Date(nowD);
  past1.setDate(nowD.getDate() - 1);
  record('Status yesterday is EXPIRED', computeMembershipStatus(past1).status === 'EXPIRED');

  // Test 6: 30 days in past -> EXPIRED
  const past30 = new Date(nowD);
  past30.setDate(nowD.getDate() - 30);
  record('Status 30 days ago is EXPIRED', computeMembershipStatus(past30).status === 'EXPIRED');

  // 5. PAYMENT METHODS & STATUSES
  const allowedMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER', 'OFFLINE'];
  for (const m of allowedMethods) {
    const pRes = await req('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ customerId: custAId, amount: 100, paymentMethod: m, status: 'PAID' }),
    });
    record(`Payment method ${m} accepted`, pRes.status === 201);
  }

  const invalidMethod = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ customerId: custAId, amount: 100, paymentMethod: 'BITCOIN', status: 'PAID' }),
  });
  record('Invalid payment method BITCOIN rejected with 400', invalidMethod.status === 400);

  // 6. PHOTO & FILE UPLOAD SECURITY
  const validPngBuf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const validBlob = new Blob([validPngBuf], { type: 'image/png' });
  const textBlob = new Blob(['bad text'], { type: 'text/plain' });
  const pdfBlob = new Blob(['%PDF-1.4 dummy'], { type: 'application/pdf' });

  // PNG
  const fPng = new globalThis.FormData();
  fPng.append('logo', validBlob, 'test.png');
  const rPng = await fetch(`${BASE_URL}/auth/profile/logo`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` }, body: fPng });
  record('Upload PNG accepted (200)', rPng.status === 200);

  // TXT rejected
  const fTxt = new globalThis.FormData();
  fTxt.append('logo', textBlob, 'test.txt');
  const rTxt = await fetch(`${BASE_URL}/auth/profile/logo`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` }, body: fTxt });
  record('Upload TXT rejected (400)', rTxt.status === 400);

  // PDF rejected
  const fPdf = new globalThis.FormData();
  fPdf.append('logo', pdfBlob, 'doc.pdf');
  const rPdf = await fetch(`${BASE_URL}/auth/profile/logo`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` }, body: fPdf });
  record('Upload PDF rejected (400)', rPdf.status === 400);

  // Fake extension (renamed exe)
  const fRenamed = new globalThis.FormData();
  fRenamed.append('logo', textBlob, 'virus.png'); // mime is text/plain
  const rRenamed = await fetch(`${BASE_URL}/auth/profile/logo`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` }, body: fRenamed });
  record('Upload fake text disguised as .png rejected (400)', rRenamed.status === 400);

  // 7. USER CREDENTIALS CHECK
  // Verify owner chandrashekhar2001k@gmail.com with Chandra@123
  const chandraLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'chandrashekhar2001k@gmail.com', password: 'Chandra@123' }),
  });
  record('Owner chandrashekhar2001k@gmail.com logs in with Chandra@123', chandraLogin.status === 200 && chandraLogin.body.token);

  // Verify customer pavan (6303803353) with Pavan@123
  const pavanLogin = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '6303803353', password: 'Pavan@123' }),
  });
  record('Customer pavan (6303803353) logs in with Pavan@123', pavanLogin.status === 200 && pavanLogin.body.token);

  console.log(`\n====================================================`);
  console.log(`DEEP VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  await pool.end();
  if (failed > 0) process.exit(1);
}

runDeepVerification().catch(async (err) => {
  console.error('Deep verification error:', err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
