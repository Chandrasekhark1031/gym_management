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
const results = [];

function check(testName, condition, detail = '') {
  const ok = Boolean(condition);
  if (ok) {
    passed += 1;
    console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
    results.push({ test: testName, status: 'PASS', detail });
  } else {
    failed += 1;
    console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    results.push({ test: testName, status: 'FAIL', detail });
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

async function runAudit() {
  console.log('=== STARTING FULL FUNCTIONALITY AUDIT TESTS ===\n');

  // Setup Owner A and Owner B
  await ensureOwner('Owner A Audit', 'owner_a_audit@test.com', '9100000001', 'PassOwnerA123', 'Gym Alpha');
  await ensureOwner('Owner B Audit', 'owner_b_audit@test.com', '9100000002', 'PassOwnerB123', 'Gym Beta');

  // 1. Owner Authentication
  const loginA = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner_a_audit@test.com', password: 'PassOwnerA123' }),
  });
  check('Owner A login via email', loginA.status === 200 && loginA.body.token);
  const tokenA = loginA.body?.token;

  const loginAPhone = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '9100000001', password: 'PassOwnerA123' }),
  });
  check('Owner A login via phone', loginAPhone.status === 200 && loginAPhone.body.token);

  const loginAInvalid = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner_a_audit@test.com', password: 'WrongPassword' }),
  });
  check('Owner login rejects invalid password', loginAInvalid.status === 401);

  const loginB = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner_b_audit@test.com', password: 'PassOwnerB123' }),
  });
  check('Owner B login', loginB.status === 200 && loginB.body.token);
  const tokenB = loginB.body?.token;

  // 2. Unauthenticated and Invalid Token access
  const unauthTest = await req('/dashboard/stats', { method: 'GET' });
  check('Unauthenticated request rejected with 401', unauthTest.status === 401);

  const badTokenTest = await req('/dashboard/stats', {
    method: 'GET',
    headers: { Authorization: 'Bearer invalid.fake.token' },
  });
  check('Invalid JWT rejected with 401', badTokenTest.status === 401);

  // 3. Plans: Create and Isolation
  const planA = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Alpha Plan 1 Month',
      durationValue: 1,
      durationUnit: 'Months',
      price: 1500,
      description: 'Standard monthly plan',
    }),
  });
  check('Owner A creates plan', planA.status === 201 && planA.body.plan?.id);
  const planAId = planA.body.plan?.id;

  const planB = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      name: 'Beta Plan 1 Year',
      durationValue: 1,
      durationUnit: 'Years',
      price: 12000,
      description: 'Annual plan',
    }),
  });
  check('Owner B creates plan', planB.status === 201 && planB.body.plan?.id);
  const planBId = planB.body.plan?.id;

  // Owner A should not see or delete Owner B's plan
  const ownerAUpdatePlanB = await req(`/plans/${planBId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Hacked Plan' }),
  });
  check('Owner A cannot edit Owner B plan (isolation)', ownerAUpdatePlanB.status === 404 || ownerAUpdatePlanB.status === 403);

  // 4. Customers: Create and Isolation
  const ts = Date.now();
  const custA = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Customer Alice',
      phone: `91${String(ts).slice(-8)}`,
      email: `alice_${ts}@example.com`,
      address: '123 Main St',
      password: 'AlicePassword123',
    }),
  });
  check('Owner A creates Customer Alice', custA.status === 201 && custA.body.customer?.id);
  const custAId = custA.body.customer?.id;

  const custB = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      name: 'Customer Bob',
      phone: `92${String(ts).slice(-8)}`,
      email: `bob_${ts}@example.com`,
      address: '456 Oak St',
      password: 'BobPassword123',
    }),
  });
  check('Owner B creates Customer Bob', custB.status === 201 && custB.body.customer?.id);
  const custBId = custB.body.customer?.id;

  // Cross-owner customer isolation
  const ownerAGetCustB = await req(`/customers/${custBId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  check('Owner A cannot access Customer Bob (isolation)', ownerAGetCustB.status === 404 || ownerAGetCustB.status === 403);

  // 5. Memberships: Assignment, Status calculation, Isolation
  // Assign 30-day active membership to Alice
  const now = new Date();
  const startDateStr = now.toISOString().slice(0, 10);
  const membActive = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customerId: custAId,
      planId: planAId,
      startDate: startDateStr,
    }),
  });
  check('Owner A assigns active membership to Alice', membActive.status === 201 && membActive.body.membership?.id);
  const membAId = membActive.body.membership?.id;
  check('Membership status is ACTIVE', membActive.body.membership?.status === 'ACTIVE', membActive.body.membership?.status);

  // Owner A cannot assign Owner B plan to Alice
  const invalidPlanAssign = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customerId: custAId,
      planId: planBId,
      startDate: startDateStr,
    }),
  });
  check('Owner A cannot assign Owner B plan (plan isolation)', invalidPlanAssign.status === 404 || invalidPlanAssign.status === 400);

  // 6. Payments: Creation, Membership Linking, Validation
  const paymentA = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customerId: custAId,
      membershipId: membAId,
      amount: 1500,
      paymentMethod: 'UPI',
      status: 'PAID',
      notes: 'Initial month payment',
    }),
  });
  check('Owner A adds payment linked to membership', paymentA.status === 201 && paymentA.body.payment?.id);
  const paymentAId = paymentA.body.payment?.id;

  // Cross-customer payment linking attempt (Alice payment with Bob membership)
  // First assign membership to Bob
  const membBob = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      customerId: custBId,
      planId: planBId,
      startDate: startDateStr,
    }),
  });
  const membBobId = membBob.body.membership?.id;

  const crossPaymentAttempt = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customerId: custAId,
      membershipId: membBobId,
      amount: 500,
      paymentMethod: 'CASH',
      status: 'PAID',
    }),
  });
  check('Cannot link customer payment to another customer/owner membership', crossPaymentAttempt.status === 400 || crossPaymentAttempt.status === 404);

  // 7. Notifications: Creation and Isolation
  const notifA = await req('/notifications', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      customerId: custAId,
      title: 'Welcome to Gym Alpha',
      message: 'Your membership is now active!',
      notificationType: 'ANNOUNCEMENT',
    }),
  });
  check('Owner A creates notification for Alice', notifA.status === 201);

  // 8. Customer Authentication & Portal
  const custLoginAlice = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: custA.body.customer.phone,
      password: 'AlicePassword123',
    }),
  });
  check('Customer Alice login via phone', custLoginAlice.status === 200 && custLoginAlice.body.token);
  const aliceToken = custLoginAlice.body?.token;

  const custLoginAliceEmail = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: custA.body.customer.email,
      password: 'AlicePassword123',
    }),
  });
  check('Customer Alice login via email', custLoginAliceEmail.status === 200);

  // 9. Customer Security: Customer blocked from Owner APIs
  const custAccessOwnerApi = await req('/customers', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer token rejected from owner API with 403', custAccessOwnerApi.status === 403);

  // 10. Customer Portal Self-Service
  const aliceProfile = await req('/customer/profile', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer Alice reads own profile', aliceProfile.status === 200 && aliceProfile.body.profile?.name === 'Customer Alice');

  const aliceDashboard = await req('/customer/dashboard', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer Alice reads own dashboard', aliceDashboard.status === 200 && aliceDashboard.body.dashboard);

  const aliceMembership = await req('/customer/membership', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer Alice views active membership', aliceMembership.status === 200 && aliceMembership.body.membership?.planName === 'Alpha Plan 1 Month');

  const alicePayments = await req('/customer/payments', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer Alice views payment history', alicePayments.status === 200 && Array.isArray(alicePayments.body.payments) && alicePayments.body.payments.length > 0);

  const aliceNotifs = await req('/customer/notifications', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer Alice views notifications', aliceNotifs.status === 200 && Array.isArray(aliceNotifs.body.notifications));

  if (aliceNotifs.body?.notifications?.length > 0) {
    const nId = aliceNotifs.body.notifications[0].id;
    const markRead = await req(`/customer/notifications/${nId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    check('Customer marks notification as read', markRead.status === 200);
  }

  const aliceGymPayment = await req('/customer/gym-payment', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check('Customer views gym payment / UPI / QR info', aliceGymPayment.status === 200 && aliceGymPayment.body.gym);

  // 11. Customer Bob Isolation from Alice
  const custLoginBob = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: custB.body.customer.phone,
      password: 'BobPassword123',
    }),
  });
  check('Customer Bob login', custLoginBob.status === 200);
  const bobToken = custLoginBob.body?.token;

  const bobPayments = await req('/customer/payments', {
    headers: { Authorization: `Bearer ${bobToken}` },
  });
  check('Customer Bob cannot see Alice payments (Customer isolation)', bobPayments.status === 200 && bobPayments.body.payments.every((p) => p.customerId === custBId));

  // 12. Owner Profile Updates: Gym details, Logo, Payment QR
  const updateOwnerProfile = await req('/auth/profile', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Owner A Updated',
      gymName: 'Alpha Fitness Club',
      upiId: 'alpha@upi',
      bankCandidateName: 'Shekhar Gym Alpha',
      paymentPhone: '9876543210',
    }),
  });
  check('Owner A updates gym profile, payment details, and bank candidate name', updateOwnerProfile.status === 200 && updateOwnerProfile.body.user?.gymName === 'Alpha Fitness Club');

  // Customer Alice verifies updated gym payment info
  const aliceUpdatedGymInfo = await req('/customer/gym-payment', {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  check(
    'Customer receives updated bank candidate name and payment phone',
    aliceUpdatedGymInfo.body.gym?.bankCandidateName === 'Shekhar Gym Alpha' && aliceUpdatedGymInfo.body.gym?.paymentPhone === '9876543210'
  );

  // 13. File Uploads (Logo, QR, and Invalid rejection)
  const validPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const blobValid = new Blob([validPng], { type: 'image/png' });
  const fakeBlob = new Blob(['console.log("bad");'], { type: 'text/plain' });

  const logoForm = new globalThis.FormData();
  logoForm.append('logo', blobValid, 'gym_logo.png');
  const logoRes = await fetch(`${BASE_URL}/auth/profile/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: logoForm,
  });
  const logoData = await logoRes.json();
  check('Owner logo upload succeeds', logoRes.status === 200 && logoData.photoUrl);

  const qrForm = new globalThis.FormData();
  qrForm.append('qrCode', blobValid, 'gym_qr.png');
  const qrRes = await fetch(`${BASE_URL}/auth/profile/qr-code`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: qrForm,
  });
  const qrData = await qrRes.json();
  check('Owner QR code upload succeeds', qrRes.status === 200 && qrData.qrCodeUrl);

  const invalidForm = new globalThis.FormData();
  invalidForm.append('logo', fakeBlob, 'malicious.txt');
  const invalidRes = await fetch(`${BASE_URL}/auth/profile/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: invalidForm,
  });
  check('Invalid file type rejected with 400', invalidRes.status === 400);

  // 14. Membership Renewal & Status Checks
  const renewRes = await req(`/memberships/${membAId}/renew`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ planId: planAId }),
  });
  check('Owner renews active membership (extends period)', renewRes.status === 200 && renewRes.body.membership?.status === 'ACTIVE');

  // 15. Customer Status toggle (Activate / Deactivate)
  const deactRes = await req(`/customers/${custAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  check('Owner deactivates customer', deactRes.status === 200 && deactRes.body.customer?.accountStatus === 'INACTIVE');

  const reactRes = await req(`/customers/${custAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  check('Owner reactivates customer', reactRes.status === 200 && reactRes.body.customer?.accountStatus === 'ACTIVE');

  // 16. Cross-Owner Payment Isolation
  const ownerBReadPaymentA = await req(`/payments/${paymentAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  check('Owner B cannot read Owner A payment (isolation)', ownerBReadPaymentA.status === 404 || ownerBReadPaymentA.status === 403);

  // 17. Cross-Owner Delete Customer Protection
  const ownerBDeleteCustA = await req(`/customers/${custAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  check('Owner B cannot delete Owner A customer (isolation)', ownerBDeleteCustA.status === 404 || ownerBDeleteCustA.status === 403);

  console.log(`\n=== AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  await pool.end();
  if (failed > 0) process.exit(1);
}

runAudit().catch(async (err) => {
  console.error('Audit execution error:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
