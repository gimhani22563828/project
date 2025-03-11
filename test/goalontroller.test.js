const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index'); // Your Express app
const Goal = require('../models/Goal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

// Mock User Authentication Middleware
jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    req.user = { _id: 'user_id' }; // Mocked user ID
    next();
  };
});

beforeAll(async () => {
  // Connect to the in-memory database before tests
  const url = 'mongodb://127.0.0.1:27017/test_finance_tracker'; // Change this if using another test DB
  await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
});

beforeEach(async () => {
  // Clear all collections before each test
  await Goal.deleteMany();
  await User.deleteMany();
  await Transaction.deleteMany();
  await Notification.deleteMany();
});

afterAll(async () => {
  // Close the database connection after tests are finished
  await mongoose.connection.close();
});

describe('Goal Controller', () => {
  // 1. Test createGoal route
  it('should create a new goal', async () => {
    const newGoal = {
      name: 'Save for vacation',
      description: 'Save $5000 for a vacation in 6 months',
      targetAmount: 5000,
      currentAmount: 0,
      currency: 'USD',
      targetDate: new Date('2025-09-01').toISOString(),
      category: 'Personal',
      priority: 'High',
      autoAllocate: true,
    };

    const response = await request(app)
      .post('/api/goals')
      .send(newGoal)
      .set('Authorization', 'Bearer mockToken'); // Adjust according to how you handle authentication

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.name).toBe(newGoal.name);
  });

  // 2. Test getGoals route
  it('should retrieve all goals for a user', async () => {
    // Create a goal first
    const goal = await Goal.create({
      user: 'user_id',
      name: 'Save for car',
      description: 'Save $2000 for a new car',
      targetAmount: 2000,
      currentAmount: 500,
      currency: 'USD',
      targetDate: new Date('2025-12-31').toISOString(),
      category: 'Personal',
      priority: 'Medium',
      autoAllocate: false,
    });

    const response = await request(app)
      .get('/api/goals')
      .set('Authorization', 'Bearer mockToken');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].name).toBe('Save for car');
  });

  // 3. Test getGoalById route
  it('should retrieve a goal by ID', async () => {
    const goal = await Goal.create({
      user: 'user_id',
      name: 'Save for wedding',
      description: 'Save $10000 for wedding in 12 months',
      targetAmount: 10000,
      currentAmount: 3000,
      currency: 'USD',
      targetDate: new Date('2026-01-01').toISOString(),
      category: 'Personal',
      priority: 'High',
      autoAllocate: true,
    });

    const response = await request(app)
      .get(`/api/goals/${goal._id}`)
      .set('Authorization', 'Bearer mockToken');

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(goal._id.toString());
    expect(response.body.name).toBe('Save for wedding');
  });

  // 4. Test updateGoal route
  it('should update a goal by ID', async () => {
    const goal = await Goal.create({
      user: 'user_id',
      name: 'Save for vacation',
      description: 'Save $3000 for a vacation',
      targetAmount: 3000,
      currentAmount: 1000,
      currency: 'USD',
      targetDate: new Date('2025-08-01').toISOString(),
      category: 'Personal',
      priority: 'Medium',
      autoAllocate: true,
    });

    const updatedGoal = {
      currentAmount: 1500,
      description: 'Save $3000 for a vacation, updated plan',
    };

    const response = await request(app)
      .put(`/api/goals/${goal._id}`)
      .send(updatedGoal)
      .set('Authorization', 'Bearer mockToken');

    expect(response.status).toBe(200);
    expect(response.body.goal.name).toBe('Save for vacation');
    expect(response.body.goal.currentAmount).toBe(1500);
    expect(response.body.notification).toContain('Goal "Save for vacation" updated!');
  });

  
});

