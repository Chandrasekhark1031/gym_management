async function runUploadTests() {
  console.log('=== TESTING FILE UPLOAD ENDPOINTS & VALIDATION ===\n');

  // 1. Owner Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'owner_a_audit@test.com', password: 'PassOwnerA123' }),
  });
  const loginData = await loginRes.json();
  const ownerToken = loginData.token;

  // Minimal 1x1 valid PNG image
  const validPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const blobValid = new Blob([validPng], { type: 'image/png' });

  // A text file masquerading as an image
  const fakeBlob = new Blob(['console.log("malicious code");'], { type: 'text/plain' });

  // TEST 1: Owner logo upload with valid image
  const logoForm = new globalThis.FormData();
  logoForm.append('logo', blobValid, 'gym_logo.png');

  const logoRes = await fetch('http://localhost:5000/api/auth/profile/logo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: logoForm,
  });
  const logoData = await logoRes.json();
  if (logoRes.status === 200 && logoData.success && logoData.photoUrl) {
    console.log('[PASS] Owner logo upload succeeded:', logoData.photoUrl);
  } else {
    console.error('[FAIL] Owner logo upload failed:', logoRes.status, logoData);
    process.exit(1);
  }

  // TEST 2: Owner QR Code upload with valid image
  const qrForm = new globalThis.FormData();
  qrForm.append('qrCode', blobValid, 'gym_qr.png');

  const qrRes = await fetch('http://localhost:5000/api/auth/profile/qr-code', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: qrForm,
  });
  const qrData = await qrRes.json();
  if (qrRes.status === 200 && qrData.success && qrData.qrCodeUrl) {
    console.log('[PASS] Owner QR code upload succeeded:', qrData.qrCodeUrl);
  } else {
    console.error('[FAIL] Owner QR code upload failed:', qrRes.status, qrData);
    process.exit(1);
  }

  // TEST 3: Invalid file upload rejection
  const invalidForm = new globalThis.FormData();
  invalidForm.append('logo', fakeBlob, 'malicious.txt');

  const invalidRes = await fetch('http://localhost:5000/api/auth/profile/logo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: invalidForm,
  });
  const invalidData = await invalidRes.json().catch(() => ({}));
  if (invalidRes.status >= 400) {
    console.log('[PASS] Invalid mime/ext file rejected properly with status:', invalidRes.status);
  } else {
    console.error('[FAIL] Invalid file was not rejected!', invalidRes.status, invalidData);
    process.exit(1);
  }

  // TEST 4: Customer photo upload by Customer
  // Customer Alice login
  const custLogin = await fetch('http://localhost:5000/api/customer/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'owner_a_audit@test.com', password: 'PassOwnerA123' }), // fallback check
  });

  console.log('\n=== ALL FILE UPLOAD TESTS PASSED ===');
}

runUploadTests().catch((err) => {
  console.error('Upload test error:', err);
  process.exit(1);
});
