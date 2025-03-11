const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticate, authorizeResource } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', goalController.createGoal);
router.get('/', goalController.getGoals);
router.get('/:id', authorizeResource, goalController.getGoalById);
router.put('/:id', authorizeResource, goalController.updateGoal);
// router.delete('/:id', authorizeResource, goalController.deleteTransaction);
// router.get('/recurring', goalController.getRecurringTransactions);
// router.post('/tags/tag', goalController.getTransactionsByTags);
// router.get('/categories/cate', goalController.getCategories);
// router.get('/reports/rep',goalController.generateReport);

module.exports = router;