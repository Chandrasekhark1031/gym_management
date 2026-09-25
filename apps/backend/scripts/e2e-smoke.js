const BASE = 'http://localhost:5000/api';

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

async function main() {
  const ownerLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner@test.com', password: 'password123' }),
  });
  console.log('Owner login', ownerLogin.status, ownerLogin.body.success);
  const ownerToken = ownerLogin.body.token;

  const plan = await req('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ name: 'Smoke Monthly', durationValue: 1, durationUnit: 'Months', price: 999, description: 'Smoke test plan' }),
  });
  console.log('Create plan', plan.status, plan.body.success);

  const customer = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Smoke Customer',
      phone: `9${Date.now().toString().slice(-9)}`,
      email: `smoke${Date.now()}@test.com`,
      password: 'Pass1234',
    }),
  });
  console.log('Create customer', customer.status, customer.body.success);
  const customerId = customer.body.customer?.id;

  const membership = await req('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ customerId, planId: plan.body.plan.id }),
  });
  console.log('Assign membership', membership.status, membership.body.success);

  const payment = await req('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ customerId, amount: 999, paymentMethod: 'CASH', status: 'PAID' }),
  });
  console.log('Create payment', payment.status, payment.body.success);

  const customerLogin = await req('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: customer.body.customer.phone, password: 'Pass1234' }),
  });
  console.log('Customer login', customerLogin.status, customerLogin.body.success);
  const customerToken = customerLogin.body.token;

  const ownerCustomersAsCustomer = await req('/customers', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  console.log('Customer blocked from owner customers', ownerCustomersAsCustomer.status);

  const customerDash = await req('/customer/dashboard', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  console.log('Customer dashboard', customerDash.status, customerDash.body.success);

  const stats = await req('/dashboard/stats', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  console.log('Dashboard stats', stats.status, stats.body.success, stats.body.stats?.totalCustomers);
}

main().catch(console.error);
