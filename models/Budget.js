const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  category: {
    type: String,
    enum: ['Food & Dining', 'Utilities', 'Transport', 'Health', 'Insurance', 'Housing', 'Education', 'Entertainment', 'Miscellaneous'],
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    threshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 80  // Percentage of budget spent when notification should be sent
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index to improve query performance
BudgetSchema.index({ user: 1, category: 1 });
BudgetSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);