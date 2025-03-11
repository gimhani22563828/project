const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

// @desc    Create a new financial goal
// @route   POST /api/goals
// @access  Private
exports.createGoal = async (req, res) => {
  try {
    const {
      name,
      description,
      targetAmount,
      currentAmount,
      currency,
      targetDate,
      category,
      priority,
      autoAllocate
    } = req.body;
    
    // Create goal
    const goal = await Goal.create({
      user: req.user._id,
      name,
      description,
      targetAmount,
      currentAmount: currentAmount || 0,
      currency,
      targetDate,
      category,
      priority,
      autoAllocate
    });
    
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get all goals for the logged-in user
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res) => {
    try {
      const { completed, priority, category } = req.query;
      
      // Build query
      const query = { user: req.user._id };
      
      // Filter by completion status
      if (completed !== undefined) {
        query.isCompleted = completed === 'true';
      }
      
      // Filter by priority
      if (priority) {
        query.priority = priority;
      }
      
      // Filter by category
      if (category) {
        query.category = category;
      }
      
      const goals = await Goal.find(query).sort({ targetDate: 1 });
      
      // Calculate progress for each goal
      const detailedGoals = goals.map(goal => {
        const goalObj = goal.toObject();
        
        // Calculate progress percentage
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        goalObj.progressPercentage = parseFloat(progress.toFixed(2));
        
        // Calculate time remaining
        const today = new Date();
        const targetDate = new Date(goal.targetDate);
        const timeRemaining = targetDate - today;
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        goalObj.daysRemaining = daysRemaining;
        
        // Calculate amount remaining
        goalObj.amountRemaining = goal.targetAmount - goal.currentAmount;
        
        // Calculate required daily/monthly savings
        if (daysRemaining > 0) {
          goalObj.dailySavingsRequired = parseFloat((goalObj.amountRemaining / daysRemaining).toFixed(2));
          goalObj.monthlySavingsRequired = parseFloat((goalObj.amountRemaining / (daysRemaining / 30)).toFixed(2));
        } else {
          goalObj.dailySavingsRequired = goalObj.amountRemaining;
          goalObj.monthlySavingsRequired = goalObj.amountRemaining;
        }
        
        return goalObj;
      });
      
      res.json(detailedGoals);
    } catch (error) {
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  };

  // @desc    Get a goal by ID
// @route   GET /api/goals/:id
// @access  Private
exports.getGoalById = async (req, res) => {
    try {
      const goal = await Goal.findById(req.params.id);
      
      if (!goal) {
        return res.status(404).json({ message: 'Goal not found.' });
      }
      
      // Calculate progress details
      const goalObj = goal.toObject();
      
      // Calculate progress percentage
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      goalObj.progressPercentage = parseFloat(progress.toFixed(2));
      
      // Calculate time remaining
      const today = new Date();
      const targetDate = new Date(goal.targetDate);
      const timeRemaining = targetDate - today;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      goalObj.daysRemaining = daysRemaining;
      
      // Calculate amount remaining
      goalObj.amountRemaining = goal.targetAmount - goal.currentAmount;
      
      // Calculate required daily/monthly savings
      if (daysRemaining > 0) {
        goalObj.dailySavingsRequired = parseFloat((goalObj.amountRemaining / daysRemaining).toFixed(2));
        goalObj.monthlySavingsRequired = parseFloat((goalObj.amountRemaining / (daysRemaining / 30)).toFixed(2));
      } else {
        goalObj.dailySavingsRequired = goalObj.amountRemaining;
        goalObj.monthlySavingsRequired = goalObj.amountRemaining;
      }
      
      // Get transactions associated with this goal
      const transactions = await Transaction.find({
        user: req.user._id,
        tags: { $in: [`goal:${goal._id}`] }
      }).sort({ date: -1 });
      
      goalObj.transactions = transactions;
      
      res.json(goalObj);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Goal not found.' });
      }
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  };

  // @desc    Update a goal by ID
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = async (req, res) => {
    try {
      const goal = await Goal.findById(req.params.id);
  
      if (!goal) {
        return res.status(404).json({ message: 'Goal not found.' });
      }
  
      // Check if user owns the goal
      if (goal.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this goal.' });
      }
  
      const updates = req.body;
      const allowedUpdates = [
        'name',
        'description',
        'targetAmount',
        'currentAmount',
        'currency',
        'targetDate',
        'category',
        'priority',
        'autoAllocate'
      ];
  
      // Update allowed fields
      allowedUpdates.forEach((field) => {
        if (updates[field] !== undefined) {
          goal[field] = updates[field];
        }
      });
  
      // Update updatedAt timestamp
      goal.updatedAt = Date.now();
  
      // Check if goal is completed
      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
      }
  
      await goal.save();
  
      // Calculate progress details
      const goalObj = goal.toObject();
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      goalObj.progressPercentage = parseFloat(progress.toFixed(2));
      goalObj.amountRemaining = goal.targetAmount - goal.currentAmount;
  
      // Prepare notification message
      let notificationMessage = '';
      if (goal.isCompleted) {
        notificationMessage = `Congratulations! You've achieved your goal "${goal.name}"! 🎉`;
      } else {
        notificationMessage = `Goal "${goal.name}" updated! Progress: ${goalObj.progressPercentage}%. Still need $${goalObj.amountRemaining.toFixed(2)} to reach your target.`;
      }
  
      // Create notification (you'll need to implement the Notification model)
      await Notification.create({
        user: req.user._id,
        goal: goal._id,
        message: notificationMessage,
        type: goal.isCompleted ? 'goal_completed' : 'goal_updated',
        read: false,
      });
  
      res.json({
        goal: goalObj,
        notification: notificationMessage
      });
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Goal not found.' });
      }
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  };
  