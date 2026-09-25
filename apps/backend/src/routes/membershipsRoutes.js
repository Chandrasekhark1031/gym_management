const express = require('express');
const {
  listMemberships,
  listExpiringMemberships,
  assignMembership,
  updateMembership,
  renewMembership,
  deleteMembership,
} = require('../controllers/membershipsController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listMemberships);
router.get('/expiring', listExpiringMemberships);
router.post('/', assignMembership);
router.put('/:id', updateMembership);
router.post('/:id/renew', renewMembership);
router.delete('/:id', deleteMembership);

module.exports = router;
