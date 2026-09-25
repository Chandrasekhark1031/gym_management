const crypto = require('crypto');
const pool = require('../config/database');
const { addDays, computeMembershipStatus, durationToDays } = require('../utils/membershipStatus');
const { getCustomerForOwner, getPlanForOwner, getMembershipForOwner } = require('../utils/ownership');

const formatMembership = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  planId: row.plan_id,
  planName: row.plan_name,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.computed_status || computeMembershipStatus(row.end_date).status,
  daysRemaining: computeMembershipStatus(row.end_date).daysRemaining,
  createdAt: row.created_at,
});

const listMemberships = async (req, res, next) => {
  try {
    const { status } = req.query;
    const result = await pool.query(
      `SELECT m.*, c.name AS customer_name, c.phone AS customer_phone, p.name AS plan_name
       FROM memberships m
       JOIN customers c ON c.id = m.customer_id
       JOIN plans p ON p.id = m.plan_id
       WHERE c.owner_id = $1
       ORDER BY m.end_date DESC`,
      [req.ownerId]
    );

    let memberships = result.rows.map((row) => formatMembership(row));
    if (status) {
      memberships = memberships.filter((m) => m.status === status);
    }

    return res.status(200).json({ success: true, memberships });
  } catch (error) {
    return next(error);
  }
};

const listExpiringMemberships = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*, c.name AS customer_name, c.phone AS customer_phone, p.name AS plan_name
       FROM memberships m
       JOIN customers c ON c.id = m.customer_id
       JOIN plans p ON p.id = m.plan_id
       WHERE c.owner_id = $1`,
      [req.ownerId]
    );

    const memberships = result.rows
      .map((row) => formatMembership(row))
      .filter((m) => m.status === 'EXPIRING_SOON')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    return res.status(200).json({ success: true, memberships });
  } catch (error) {
    return next(error);
  }
};

const assignMembership = async (req, res, next) => {
  try {
    const { customerId, planId, startDate } = req.body;
    if (!customerId || !planId) {
      return res.status(400).json({ success: false, message: 'Customer and plan are required' });
    }

    const customer = await getCustomerForOwner(customerId, req.ownerId);
    const plan = await getPlanForOwner(planId, req.ownerId);
    if (!customer || !plan) {
      return res.status(404).json({ success: false, message: 'Customer or plan not found' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = addDays(start, plan.duration_days);
    const id = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO memberships (id, customer_id, plan_id, start_date, end_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW())
       RETURNING *`,
      [id, customerId, planId, start, end]
    );

    return res.status(201).json({
      success: true,
      membership: formatMembership({
        ...result.rows[0],
        customer_name: customer.name,
        customer_phone: customer.phone,
        plan_name: plan.name,
      }),
    });
  } catch (error) {
    return next(error);
  }
};

const updateMembership = async (req, res, next) => {
  try {
    const membership = await getMembershipForOwner(req.params.id, req.ownerId);
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    const { planId, startDate } = req.body;
    let plan = null;
    if (planId) {
      plan = await getPlanForOwner(planId, req.ownerId);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }
    }

    const start = startDate ? new Date(startDate) : new Date(membership.start_date);
    const durationDays = plan ? plan.duration_days : null;
    const endDate = durationDays ? addDays(start, durationDays) : membership.end_date;

    const result = await pool.query(
      `UPDATE memberships
       SET plan_id = COALESCE($1, plan_id),
           start_date = $2,
           end_date = $3
       WHERE id = $4
       RETURNING *`,
      [planId || null, start, endDate, req.params.id]
    );

    const details = await pool.query(
      `SELECT m.*, c.name AS customer_name, c.phone AS customer_phone, p.name AS plan_name
       FROM memberships m
       JOIN customers c ON c.id = m.customer_id
       JOIN plans p ON p.id = m.plan_id
       WHERE m.id = $1`,
      [req.params.id]
    );

    return res.status(200).json({ success: true, membership: formatMembership(details.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const renewMembership = async (req, res, next) => {
  try {
    const membership = await getMembershipForOwner(req.params.id, req.ownerId);
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    const { planId, mode } = req.body || {};
    const targetPlanId = planId || membership.plan_id;
    const plan = await getPlanForOwner(targetPlanId, req.ownerId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const today = new Date();
    const currentEnd = new Date(membership.end_date);

    if (mode === 'create_new') {
      const start = currentEnd > today ? currentEnd : today;
      const end = addDays(start, plan.duration_days);
      const id = crypto.randomUUID();

      const result = await pool.query(
        `INSERT INTO memberships (id, customer_id, plan_id, start_date, end_date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW())
         RETURNING *`,
        [id, membership.customer_id, targetPlanId, start, end]
      );

      const customer = await pool.query('SELECT name, phone FROM customers WHERE id = $1', [membership.customer_id]);
      return res.status(201).json({
        success: true,
        membership: formatMembership({
          ...result.rows[0],
          customer_name: customer.rows[0]?.name,
          customer_phone: customer.rows[0]?.phone,
          plan_name: plan.name,
        }),
      });
    }

    // Default: extend and update the existing membership so no duplicate row is added!
    const baseDate = currentEnd > today ? currentEnd : today;
    const newEndDate = addDays(baseDate, plan.duration_days);
    const newStartDate = currentEnd < today ? today : membership.start_date;

    const result = await pool.query(
      `UPDATE memberships
       SET plan_id = $1,
           start_date = $2,
           end_date = $3,
           status = 'ACTIVE'
       WHERE id = $4
       RETURNING *`,
      [targetPlanId, newStartDate, newEndDate, req.params.id]
    );

    const customer = await pool.query('SELECT name, phone FROM customers WHERE id = $1', [membership.customer_id]);

    return res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      membership: formatMembership({
        ...result.rows[0],
        customer_name: customer.rows[0]?.name,
        customer_phone: customer.rows[0]?.phone,
        plan_name: plan.name,
      }),
    });
  } catch (error) {
    return next(error);
  }
};

const deleteMembership = async (req, res, next) => {
  try {
    const membership = await getMembershipForOwner(req.params.id, req.ownerId);
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    await pool.query('UPDATE payments SET membership_id = NULL WHERE membership_id = $1', [req.params.id]);
    await pool.query('DELETE FROM memberships WHERE id = $1', [req.params.id]);

    return res.status(200).json({ success: true, message: 'Membership deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMemberships,
  listExpiringMemberships,
  assignMembership,
  updateMembership,
  renewMembership,
  deleteMembership,
};
