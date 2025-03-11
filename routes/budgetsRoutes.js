const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticate, authorizeResource } = require('../middleware/auth');

router.use(express.json());
// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', budgetController.createBudget);
router.get('/', budgetController.getBudgets);
router.get('/recommendations', budgetController.getBudgetRecommendations);
router.get('/:id', authorizeResource, budgetController.getBudgetById);
router.put('/:id', authorizeResource, budgetController.updateBudget);
router.delete('/:id', authorizeResource, budgetController.deleteBudget);

module.exports = router;