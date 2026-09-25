const express = require('express');
const {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
} = require('../controllers/paymentsController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listPayments);
router.get('/:id', getPayment);
router.post('/', createPayment);
router.put('/:id', updatePayment);

module.exports = router;
