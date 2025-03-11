const request = require('supertest');
const app = require('../index'); 
const mockingoose = require('mockingoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Mock user authentication middleware
jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    req.user = { _id: '12345' }; // Mock logged-in user
    next();
  };
});

describe('Budget Controller', () => {
  // Mock data for budget and transactions
  const budgetData = {
    name: 'Test Budget',
    amount: 1000,
    currency: 'USD',
    period: 'monthly',
    category: 'Food',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    notifications: { email: true, sms: false },
  };

  const transactionData = [
    { amount: 100, date: '2025-01-10', category: 'Food', type: 'expense', user: '12345' },
    { amount: 50, date: '2025-01-15', category: 'Food', type: 'expense', user: '12345' },
  ];

  afterEach(() => {
    mockingoose.resetAll();
  });

  // Test case for creating a new budget
  it('should create a new budget', async () => {
    mockingoose(Budget).toReturn(budgetData, 'save');

    const res = await request(app)
      .post('/api/budgets')
      .send(budgetData)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(budgetData.name);
    expect(res.body.amount).toBe(budgetData.amount);
  });

  // Test case for getting all budgets
  it('should get all budgets for the logged-in user', async () => {
    mockingoose(Budget).toReturn([budgetData], 'find');

    const res = await request(app)
      .get('/api/budgets')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Test case for getting a budget by ID
  it('should get a budget by ID', async () => {
    mockingoose(Budget).toReturn(budgetData, 'findOne');

    const res = await request(app)
      .get(`/api/budgets/${budgetData._id}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(budgetData.name);
  });

  // Test case for updating a budget
  it('should update a budget', async () => {
    const updatedData = { name: 'Updated Budget', amount: 1500 };

    mockingoose(Budget).toReturn({ ...budgetData, ...updatedData }, 'findOneAndUpdate');

    const res = await request(app)
      .put(`/api/budgets/${budgetData._id}`)
      .send(updatedData)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(updatedData.name);
    expect(res.body.amount).toBe(updatedData.amount);
  });

  // Test case for deleting a budget
  it('should delete a budget', async () => {
    mockingoose(Budget).toReturn(budgetData, 'findOne');
    mockingoose(Budget).toReturn(null, 'deleteOne');

    const res = await request(app)
      .delete(`/api/budgets/${budgetData._id}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Budget removed.');
  });

  // Test case for getting budget recommendations
  it('should get budget recommendations based on spending patterns', async () => {
    // Mocking transaction aggregation
    mockingoose(Transaction).toReturn(transactionData, 'aggregate');
    mockingoose(Budget).toReturn([budgetData], 'find');

    const res = await request(app)
      .get('/api/budgets/recommendations')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].category).toBe(transactionData[0].category);
    expect(res.body[0].monthlySpending).toBeGreaterThan(0);
  });
});
