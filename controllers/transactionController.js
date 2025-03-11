const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');


const { convertCurrency } = require('../utils/currencyConverter');

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      currency,
      category,
      subcategory,
      description,
      date,
      tags,
      isRecurring,
      recurringDetails
    } = req.body;

    // Convert amount to base currency (USD)
    const convertedAmount = await convertCurrency(amount, currency, 'USD');

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: convertedAmount,
      currency: 'USD', // Storing the amount in USD (or another base currency)
      category,
      subcategory,
      description,
      date: date || Date.now(),
      tags,
      isRecurring,
      recurringDetails
    });

    // Check for recurring transactions and handle their logic (this is an example)
    if (isRecurring && recurringDetails) {
      const { frequency, startDate, endDate } = recurringDetails;
      // Logic to handle recurrence would go here
    }

    // Return the created transaction
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


// @desc    Get all transactions for the logged-in user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      type, 
      category, 
      tags,
      sortBy,
      sortOrder,
      limit,
      page
    } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    // Date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Type filter
    if (type) query.type = type;
    
    // Category filter
    if (category) query.category = category;
    
    // Tags filter
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    // Set up pagination
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    
    // Set up sorting
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.date = -1;  // Default sort by date descending
    }
    
    // Execute query
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber);
      
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(totalCount / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get a transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    
    res.json(transaction);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private

exports.updateTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      currency,
      category,
      subcategory,
      description,
      date,
      tags,
      isRecurring,
      recurringDetails
    } = req.body;

    // Find the transaction by ID
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Convert amount to base currency (USD) if the currency is updated
    let convertedAmount = amount;
    if (currency && currency !== transaction.currency) {
      convertedAmount = await convertCurrency(amount, currency, 'USD');
    }

    // Update fields (only if they are provided)
    if (type) transaction.type = type;
    if (convertedAmount) transaction.amount = convertedAmount;
    if (currency) transaction.currency = currency; // Update the currency
    if (category) transaction.category = category;
    if (subcategory !== undefined) transaction.subcategory = subcategory;
    if (description !== undefined) transaction.description = description;
    if (date) transaction.date = date;
    if (tags) transaction.tags = tags;
    if (isRecurring !== undefined) transaction.isRecurring = isRecurring;
    if (recurringDetails) transaction.recurringDetails = {
      ...transaction.recurringDetails,
      ...recurringDetails
    };

    transaction.updatedAt = Date.now();

    // Save the updated transaction
    const updatedTransaction = await transaction.save();

    // Return the updated transaction
    res.json(updatedTransaction);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};



// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    
    await transaction.deleteOne();
    
    res.json({ message: 'Transaction removed.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get all recurring transactions
// @route   GET /api/transactions/recurring
// @access  Private
exports.getRecurringTransactions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactions = await Transaction.find({
      user: req.user._id,
      isRecurring: true
    }).sort({ 'recurringDetails.startDate': 1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get transactions by tags
// @route   POST /api/transactions/tags/tag
// @access  Private
exports.getTransactionsByTags = async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of tags.' });
    }
    
    const transactions = await Transaction.find({
      user: req.user._id,
      tags: { $in: tags }
    }).sort({ date: -1 });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Get all categories used in transactions
// @route   GET /api/transactions/categories/cate
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Transaction.distinct('category', { user: req.user._id });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// @desc    Generate a text-based transaction report
// @route   GET /api/reports
// @access  Private
exports.generateReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Optional date range from query params

    // Log the user ID and query parameters for debugging
    console.log('User ID:', req.user._id);
    console.log('Query Params:', { startDate, endDate });

    // Fetch transactions for the user
    const query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
      
      // Log the date parsing to ensure it works
      console.log('Parsed Date Range:', {
        start: new Date(startDate),
        end: new Date(endDate)
      });
    }

    console.log('Query:', query);

    const transactions = await Transaction.find(query).sort({ date: 1 });

    // Check if transactions exist
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: 'No transactions found for the specified criteria.' });
    }

    // Calculate summaries
    const incomeTotal = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const netTotal = incomeTotal - expenseTotal;

    // Build text-based report
    let reportText = 'Transaction Report\n\n';
    reportText += '=== Summary ===\n';
    reportText += `Total Income: $${incomeTotal.toFixed(2)}\n`;
    reportText += `Total Expenses: $${expenseTotal.toFixed(2)}\n`;
    reportText += `Net Total: $${netTotal.toFixed(2)} ${netTotal >= 0 ? '(Positive)' : '(Negative)'}\n\n`;

    // Text-based visualization of Income vs Expenses
    reportText += '=== Income vs Expenses (Text Representation) ===\n';
    reportText += 'Income: ';
    reportText += '='.repeat(Math.floor((incomeTotal / (incomeTotal + expenseTotal)) * 50) || 1);
    reportText += ` ($${incomeTotal.toFixed(2)})\n`;
    reportText += 'Expenses: ';
    reportText += '='.repeat(Math.floor((expenseTotal / (incomeTotal + expenseTotal)) * 50) || 1);
    reportText += ` ($${expenseTotal.toFixed(2)})\n\n`;

    // Detailed Transactions
    reportText += '=== Detailed Transactions ===\n';
    transactions.forEach((t, index) => {
      reportText += `${index + 1}. ${t.date.toISOString().split('T')[0]} - ${t.type.toUpperCase()}\n`;
      reportText += `   Amount: $${t.amount.toFixed(2)} ${t.currency}\n`;
      reportText += `   Category: ${t.category}${t.subcategory ? ` (${t.subcategory})` : ''}\n`;
      reportText += `   Description: ${t.description || 'N/A'}\n`;
      if (t.tags && t.tags.length) reportText += `   Tags: ${t.tags.join(', ')}\n`;
      if (t.isRecurring) {
        reportText += `   Recurring: ${t.recurringDetails.frequency} (Start: ${t.recurringDetails.startDate.toISOString().split('T')[0]})\n`;
      }
      reportText += '\n';
    });

    // Send the text response
    res.setHeader('Content-Type', 'text/plain');
    res.send(reportText);
  } catch (error) {
    console.error('Error in generateReport:', error);
    res.status(500).json({ message: 'Error generating report.', error: error.message });
  }
};