const request = require('supertest');
const app = require('../index');
const mockingoose = require('mockingoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: '12345' };
    next();
  },
  authorizeAdmin: jest.fn((req, res, next) => next()),
  authorizeResource: jest.fn((req, res, next) => next())
}));

describe('Budget Controller', () => {
  const budgetData = {
    _id: '5f8d04b3ab35de39842c6a82',
    name: 'Test Budget',
    amount: 1000,
    currency: 'USD',
    period: 'monthly',
    category: 'Food',
    user: '12345'
  };

  const transactionAggregateResult = [
    { _id: 'Food', total: 150 }
  ];

  afterEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should create a new budget', async () => {
    mockingoose(Budget).toReturn(budgetData, 'save');

    const res = await request(app)
      .post('/api/budget')
      .send(budgetData);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(budgetData);
  });

  it('should get all budgets for the user', async () => {
    mockingoose(Budget).toReturn([budgetData], 'find');

    const res = await request(app)
      .get('/api/budget');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining(budgetData)
    ]));
  });

  it('should get a budget by ID', async () => {
    mockingoose(Budget).toReturn(budgetData, 'findOne');

    const res = await request(app)
      .get(`/api/budget/${budgetData._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(budgetData);
  });

  it('should update a budget', async () => {
    const updatedData = { name: 'Updated Budget', amount: 1500 };
    mockingoose(Budget).toReturn(
      { ...budgetData, ...updatedData }, 
      'findOneAndUpdate'
    );

    const res = await request(app)
      .put(`/api/budget/${budgetData._id}`)
      .send(updatedData);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(updatedData);
  });

  it('should delete a budget', async () => {
    mockingoose(Budget).toReturn({ deletedCount: 1 }, 'deleteOne');

    const res = await request(app)
      .delete(`/api/budget/${budgetData._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Budget removed' });
  });

  it('should get budget recommendations', async () => {
    mockingoose(Transaction).toReturn(transactionAggregateResult, 'aggregate');
    mockingoose(Budget).toReturn([budgetData], 'find');

    const res = await request(app)
      .get('/api/budget/recommendations');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        category: 'Food',
        monthlySpending: 150,
        budgetLimit: 1000
      })
    ]);
  });
});