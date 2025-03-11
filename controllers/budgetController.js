const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    const {
      name,
      amount,
      currency,
      period,
      category,
      startDate,
      endDate,
      notifications
    } = req.body;
    
    // Create budget
    const budget = await Budget.create({
      user: req.user._id,
      name,
      amount,
      currency,
      period,
      category,
      startDate: startDate || Date.now(),
      endDate,
      notifications
    });
    
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get all budgets for the logged-in user
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const { active, period, category } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    // Filter by active status
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    // Filter by period
    if (period) {
      query.period = period;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    const budgets = await Budget.find(query).sort({ createdAt: -1 });
    
    // Calculate current spending for each budget
    const detailedBudgets = await Promise.all(budgets.map(async (budget) => {
      const budgetObj = budget.toObject();
      
      // Define date range based on budget period
      let startDate, endDate = new Date();
      const today = new Date();
      
      switch (budget.period) {
        case 'daily':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(today.setHours(23, 59, 59, 999));
          break;
        case 'weekly':
          const day = today.getDay();
          startDate = new Date(today);
          startDate.setDate(today.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'quarterly':
          const quarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), quarter * 3, 1);
          endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
          break;
        case 'annually':
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        default:
          startDate = budget.startDate;
          endDate = budget.endDate || new Date();
      }
      
      // Get transactions within the date range for this category
      const transactions = await Transaction.find({
        user: req.user._id,
        type: 'expense',
        category: budget.category,
        date: { $gte: startDate, $lte: endDate }
      });
      
      // Calculate total spending
      const spent = transactions.reduce((total, transaction) => {
        return total + transaction.amount;
      }, 0);
      
      // Calculate percentage spent
      const percentSpent = (spent / budget.amount) * 100;
      
      // Add to budget object
      budgetObj.spent = spent;
      budgetObj.remaining = budget.amount - spent;
      budgetObj.percentSpent = parseFloat(percentSpent.toFixed(2));
      budgetObj.transactions = transactions.length;
      
      return budgetObj;
    }));
    
    res.json(detailedBudgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get a budget by ID
// @route   GET /api/budgets/:id
// @access  Private
exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    
    // Calculate current spending
    const budgetObj = budget.toObject();
    
    // Define date range based on budget period
    let startDate, endDate = new Date();
    
    switch (budget.period) {
      case 'daily':
        const today = new Date();
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        const currentDay = new Date();
        const day = currentDay.getDay();
        startDate = new Date(currentDay);
        startDate.setDate(currentDay.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarterly':
        const currentDate = new Date();
        const quarter = Math.floor(currentDate.getMonth() / 3);
        startDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
        endDate = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'annually':
        const thisYear = new Date();
        startDate = new Date(thisYear.getFullYear(), 0, 1);
        endDate = new Date(thisYear.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = budget.startDate;
        endDate = budget.endDate || new Date();
    }
    
    // Get transactions within the date range for this category
    const transactions = await Transaction.find({
      user: req.user._id,
      type: 'expense',
      category: budget.category,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    // Calculate total spending
    const spent = transactions.reduce((total, transaction) => {
      return total + transaction.amount;
    }, 0);
    
    // Calculate percentage spent
    const percentSpent = (spent / budget.amount) * 100;
    
    // Add to budget object
    budgetObj.spent = spent;
    budgetObj.remaining = budget.amount - spent;
    budgetObj.percentSpent = parseFloat(percentSpent.toFixed(2));
    budgetObj.transactions = transactions;
    budgetObj.startDate = startDate;
    budgetObj.endDate = endDate;
    
    res.json(budgetObj);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    const {
      name,
      amount,
      currency,
      period,
      category,
      startDate,
      endDate,
      isActive,
      notifications
    } = req.body;
    
    // Find the budget
    const budget = await Budget.findById(req.params.id);
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    
    // Update fields
    if (name) budget.name = name;
    if (amount) budget.amount = amount;
    if (currency) budget.currency = currency;
    if (period) budget.period = period;
    if (category) budget.category = category;
    if (startDate) budget.startDate = startDate;
    if (endDate !== undefined) budget.endDate = endDate;
    if (isActive !== undefined) budget.isActive = isActive;
    if (notifications) {
      budget.notifications = {
        ...budget.notifications,
        ...notifications
      };
    }
    
    budget.updatedAt = Date.now();
    
    const updatedBudget = await budget.save();
    
    res.json(updatedBudget);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    
    await budget.deleteOne();
    
    res.json({ message: 'Budget removed.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get budget recommendations
// @route   GET /api/budgets/recommendations
// @access  Private
exports.getBudgetRecommendations = async (req, res) => {
  try {
    // Get user's spending patterns for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Get all expenses grouped by category
    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: threeMonthsAgo }
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
          avgSpent: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalSpent: -1 }
      }
    ]);
    
    // Get existing budgets
    const existingBudgets = await Budget.find({
      user: req.user._id,
      isActive: true
    });
    
    const existingBudgetCategories = existingBudgets.map(budget => budget.category);
    
    // Generate recommendations
    const recommendations = expenses.map(expense => {
      // Check if budget already exists for this category
      const existingBudget = existingBudgets.find(b => b.category === expense._id);
      
      let recommendation = {
        category: expense._id,
        monthlySpending: expense.totalSpent / 3, // Average monthly spending
        transactionCount: expense.count,
        existingBudget: existingBudget ? true : false
      };
      
      // If budget exists, check if it's adequate
      if (existingBudget) {
        const monthlyEquivalent = existingBudget.period === 'monthly' ? 
          existingBudget.amount : 
          existingBudget.amount * (existingBudget.period === 'weekly' ? 4 : 
                                  existingBudget.period === 'daily' ? 30 : 
                                  existingBudget.period === 'quarterly' ? 1/3 : 
                                  existingBudget.period === 'annually' ? 1/12 : 1);
        
        recommendation.currentBudget = monthlyEquivalent;
        recommendation.variance = ((recommendation.monthlySpending / monthlyEquivalent) * 100) - 100;
        recommendation.needsAdjustment = Math.abs(recommendation.variance) > 15; // Suggest adjustment if off by 15%
        
        if (recommendation.needsAdjustment) {
          recommendation.suggestedBudget = Math.ceil(recommendation.monthlySpending * 1.1); // Suggest 10% more than current spending
        }
      } else {
        // Suggest new budget
        recommendation.suggestedBudget = Math.ceil(recommendation.monthlySpending * 1.1); // Suggest 10% more than current spending
      }
      
      return recommendation;
    });
    
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};