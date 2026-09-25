const express = require('express');
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
  uploadCustomerPhoto,
} = require('../controllers/customersController');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(protect, requireOwner);

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.patch('/:id/status', updateCustomerStatus);
router.delete('/:id', deleteCustomer);
router.post('/:id/photo', upload.single('photo'), uploadCustomerPhoto);

module.exports = router;
