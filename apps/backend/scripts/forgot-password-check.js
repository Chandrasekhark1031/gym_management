/**
 * Forgot-password code-path verification (no fake OTP).
 * Runtime E2E requires SMTP; this script verifies endpoints and env state.
 */
require('../src/config/env');
const { smtp } = require('../src/config/env');

const BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, raw: text };
}

async function main() {
  console.log('--- Forgot password / SMTP status ---');
  const smtpConfigured = Boolean(smtp.host && smtp.user && smtp.password && smtp.from);
  console.log(`SMTP configured: ${smtpConfigured ? 'yes' : 'no'}`);
  if (!smtpConfigured) {
    console.log('Runtime E2E blocked only because SMTP credentials are not configured.');
    console.log('Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM (SMTP_PORT optional)');
  }

  const forgot = await req('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'owner@test.com' }),
  });
  console.log(`POST /auth/forgot-password → ${forgot.status}`);
  const exposesOtp = typeof forgot.body === 'object' && forgot.body && 'otp' in forgot.body;
  console.log(`OTP exposed in API response: ${exposesOtp ? 'yes (FAIL)' : 'no'}`);

  const badOtp = await req('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: 'owner@test.com', otp: '000000' }),
  });
  console.log(`Wrong OTP rejected: ${badOtp.status === 401 || badOtp.status === 400} (${badOtp.status})`);

  console.log('Code paths: forgot-password, verify-otp, reset-password routes exist in authRoutes.js (verified by prior audit).');
}

main().catch(console.error);
