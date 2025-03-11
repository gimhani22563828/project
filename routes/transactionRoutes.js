const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticate, authorizeResource } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.get('/:id', authorizeResource, transactionController.getTransactionById);
router.put('/:id', authorizeResource, transactionController.updateTransaction);
router.delete('/:id', authorizeResource, transactionController.deleteTransaction);
router.get('/recurring', transactionController.getRecurringTransactions);
router.post('/tags/tag', transactionController.getTransactionsByTags);
router.get('/categories/cate', transactionController.getCategories);
router.get('/reports/rep',transactionController.generateReport);

module.exports = router;