const express = require('express');
const {
  listPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  deletePlan,
} = require('../controllers/plansController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listPlans);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.patch('/:id/status', updatePlanStatus);
router.delete('/:id', deletePlan);

module.exports = router;
