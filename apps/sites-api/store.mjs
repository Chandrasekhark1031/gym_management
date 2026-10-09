// One record per domain object. Prepared D1 statements and atomic batches avoid
// overwriting other members' changes. The API enforces the configured owner identity.
export const getStore = (DB) => {
  if (!DB) throw new Error('Workspace storage is unavailable.');
  return {
    async get(id, kind) { const row = await DB.prepare('SELECT payload FROM gym_records WHERE id = ? AND kind = ?').bind(id, kind).first(); return row ? JSON.parse(row.payload) : null; },
    async list(kind) { const result = await DB.prepare('SELECT payload FROM gym_records WHERE kind = ? ORDER BY created_at DESC').bind(kind).all(); return result.results.map(row => JSON.parse(row.payload)); },
    putStatement(kind, data, ignore = false) { return DB.prepare(ignore ? 'INSERT OR IGNORE INTO gym_records (id,kind,payload,created_at) VALUES (?,?,?,?)' : 'INSERT INTO gym_records (id,kind,payload,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(data.id, kind, JSON.stringify(data), data.createdAt || new Date().toISOString()); },
    async put(kind, data) { await this.putStatement(kind, data).run(); return data; },
    async batch(items, ignore = false) { await DB.batch(items.map(([kind, data]) => this.putStatement(kind, data, ignore))); },
    async remove(id, kind) { await DB.prepare('DELETE FROM gym_records WHERE id = ? AND kind = ?').bind(id, kind).run(); },
  };
};
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const addDays = (date, amount) => new Date(Date.parse(date.slice(0, 10) + 'T00:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
export function statusFor(m) {
  const daysRemaining = Math.round((Date.parse(m.endDate.slice(0, 10) + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 86400000);
  if (m.cancelled) return { status: 'CANCELLED', daysRemaining };
  if (m.startDate.slice(0, 10) > today()) return { status: 'UPCOMING', daysRemaining };
  return { status: daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= 7 ? 'EXPIRING_SOON' : 'ACTIVE', daysRemaining };
}
export async function seed(store) {
  if (await store.get('owner', 'owner')) return;
  const now = new Date().toISOString();
  const items = [['owner', { id: 'owner', name: 'Chandra Shekhar', gymName: 'FitBro Gym', phone: '9000000000', email: 'owner@example.invalid', address: 'Visakhapatnam, Andhra Pradesh', upiId: '', bankCandidateName: '', paymentPhone: '', qrCodeUrl: '', photoUrl: '', role: 'owner', createdAt: now }]];
  const plans = [
    { id: 'plan-starter', name: 'Starter', durationValue: 1, durationUnit: 'Months', durationDays: 30, price: 1200, description: 'Build a routine. Full gym access, strength equipment and cardio.' },
    { id: 'plan-quarterly', name: 'Momentum', durationValue: 3, durationUnit: 'Months', durationDays: 90, price: 3200, description: 'Keep showing up. Full gym access and a guided training introduction.' },
    { id: 'plan-annual', name: 'Commit', durationValue: 1, durationUnit: 'Years', durationDays: 365, price: 11000, description: 'Make strength a lifestyle. A full year of training at your pace.' },
  ].map(p => ({ ...p, isActive: true, createdAt: now }));
  plans.forEach(p => items.push(['plan', p]));
  const names = ['Arjun Reddy', 'Priya Sharma', 'Rahul Kumar', 'Sneha Rao', 'Kiran Patel', 'Ananya Das', 'Vikram Singh', 'Divya Nair', 'Aditya Rao', 'Meera Joshi', 'Rohit Verma', 'Neha Reddy'];
  const ends = [3, 6, 2, 5, 21, 48, 27, 14, -3, -9, 29, null];
  names.forEach((name, i) => {
    const customerId = `member-${i+1}`;
    items.push(['customer', { id: customerId, name, phone: `90000000${String(i+1).padStart(2,'0')}`, email: `${name.split(' ')[0].toLowerCase()}@example.invalid`, address: 'Visakhapatnam', accountStatus: 'ACTIVE', photoUrl: '', createdAt: now }]);
    if (ends[i] === null) return;
    const p = plans[i % 3];
    const endDate = addDays(today(), ends[i]);
    const membershipId = `membership-${i+1}`;
    items.push(['membership', { id: membershipId, customerId, planId: p.id, startDate: addDays(endDate, -p.durationDays), endDate, createdAt: now }]);
    items.push(['payment', { id: `payment-${i+1}`, customerId, membershipId, amount: p.price, paymentMethod: i % 2 ? 'UPI' : 'CASH', paymentDate: addDays(today(), -(i % 5)), status: i === 1 || i === 3 ? 'PENDING' : 'PAID', notes: 'Sample record', createdAt: now }]);
  });
  for (let i=1; i<=5; i++) { const d = new Date(); d.setDate(10); d.setMonth(d.getMonth() - i); items.push(['payment', { id: `historic-${i}`, customerId: 'member-1', amount: 1200 + i * 120, membershipId: null, paymentDate: d.toISOString().slice(0,10), paymentMethod: 'CASH', status: 'PAID', notes: 'Sample record', createdAt: now }]); }
  items.push(['notification', { id: 'welcome-owner', audience: 'owner', customerId: null, title: 'Welcome to your private gym workspace', message: 'Starter records are fictional examples. Add your members, adjust your plans and configure your gym payment details.', isRead: false, type: 'ANNOUNCEMENT', createdAt: now }]);
  await store.batch(items, true);
}
