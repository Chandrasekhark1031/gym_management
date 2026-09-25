const crypto = require('crypto');
const pool = require('../config/database');
const { getPlanForOwner } = require('../utils/ownership');
const { durationToDays } = require('../utils/membershipStatus');

const formatPlan = (row) => ({
  id: row.id,
  name: row.name,
  durationValue: row.duration_value ?? row.duration_days,
  durationUnit: row.duration_unit || 'Days',
  durationDays: row.duration_days,
  price: Number(row.price),
  description: row.description,
  isActive: row.is_active,
  customerCount: Number(row.customer_count || 0),
  createdAt: row.created_at,
});

const listPlans = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
         (SELECT COUNT(DISTINCT m.customer_id)
          FROM memberships m
          JOIN customers c ON c.id = m.customer_id
          WHERE m.plan_id = p.id AND c.owner_id = p.owner_id) AS customer_count
       FROM plans p
       WHERE p.owner_id = $1
       ORDER BY p.created_at DESC`,
      [req.ownerId]
    );
    return res.status(200).json({ success: true, plans: result.rows.map(formatPlan) });
  } catch (error) {
    return next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const { name, durationValue, durationUnit, price, description, isActive } = req.body;
    if (!name || !durationValue || !durationUnit || price === undefined) {
      return res.status(400).json({ success: false, message: 'Required plan fields missing' });
    }

    const durationDays = durationToDays(durationValue, durationUnit);
    const id = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO plans (id, owner_id, name, duration_days, duration_value, duration_unit, price, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [id, req.ownerId, name.trim(), durationDays, durationValue, durationUnit, price, description || null, isActive !== false]
    );

    return res.status(201).json({ success: true, plan: formatPlan({ ...result.rows[0], customer_count: 0 }) });
  } catch (error) {
    return next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await getPlanForOwner(req.params.id, req.ownerId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const { name, durationValue, durationUnit, price, description, isActive } = req.body;
    const durationDays = durationValue && durationUnit ? durationToDays(durationValue, durationUnit) : plan.duration_days;

    const result = await pool.query(
      `UPDATE plans
       SET name = COALESCE($1, name),
           duration_value = COALESCE($2, duration_value),
           duration_unit = COALESCE($3, duration_unit),
           duration_days = $4,
           price = COALESCE($5, price),
           description = COALESCE($6, description),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [
        name || null,
        durationValue || null,
        durationUnit || null,
        durationDays,
        price ?? null,
        description || null,
        isActive ?? null,
        req.params.id,
        req.ownerId,
      ]
    );

    return res.status(200).json({ success: true, plan: formatPlan(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const updatePlanStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const result = await pool.query(
      `UPDATE plans SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [Boolean(isActive), req.params.id, req.ownerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    return res.status(200).json({ success: true, plan: formatPlan(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await getPlanForOwner(req.params.id, req.ownerId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const usage = await pool.query('SELECT COUNT(*)::int AS count FROM memberships WHERE plan_id = $1', [req.params.id]);
    if (usage.rows[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete plan with membership history' });
    }

    await pool.query('DELETE FROM plans WHERE id = $1 AND owner_id = $2', [req.params.id, req.ownerId]);
    return res.status(200).json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  deletePlan,
};
