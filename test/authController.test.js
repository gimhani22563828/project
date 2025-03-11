const request = require('supertest');
const app = require('../index');  // Your app entry point
const User = require('../models/User');  // Your User model
const jwt = require('jsonwebtoken');  // JWT module for token operations
const dotenv = require('dotenv');  // dotenv for environment variables
const mongoose = require('mongoose');  // MongoDB mongoose for connection handling

dotenv.config();

// Mocking necessary modules
jest.mock('../models/User');  // Mock the User model
jest.mock('jsonwebtoken');    // Mock the JWT module

// Suppress MongoDB logs during tests to avoid "Cannot log after tests are done" error
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  // Ensure MongoDB connections are closed after tests
  await mongoose.connection.close();
  // Restore the console.log function after tests
  console.log.mockRestore();
});

describe('Auth Controller', () => {
  const mockUser = {
    _id: '60b7b8c6e1fa3a3c4c7c4f25',
    name: 'John Doe',
    email: 'johndoe@example.com',
    password: 'hashedpassword',  // Assuming this is a hashed password
    role: 'user',
    isActive: true,
    comparePassword: jest.fn(() => true)  // Mock the password comparison method
  };

  // Clear mocks before each test to ensure clean test environment
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test for successful user registration
  it('should register a new user and return a success message', async () => {
    User.findOne.mockResolvedValue(null);  // Mock that no user was found
    User.create.mockResolvedValue(mockUser);  // Mock successful user creation

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        username: 'john_doe',
        email: 'johndoe@example.com',
        password: 'password',
        role: 'user'
      });

    expect(response.status).toBe(201);  // Expect HTTP status 201 (Created)
    expect(response.body.message).toBe('User registered successfully!');  // Check response message
  });

  // Test for user already exists during registration
  it('should return an error if user already exists', async () => {
    User.findOne.mockResolvedValue(mockUser);  // Mock that a user with the same email already exists

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        username: 'john_doe',
        email: 'johndoe@example.com',
        password: 'password',
        role: 'user'
      });

    expect(response.status).toBe(400);  // Expect HTTP status 400 (Bad Request)
    expect(response.body.message).toBe('User already exists.');  // Check response message
  });

  // Test for user login (successful)
  it('should login an existing user and return a token', async () => {
  // Mock user and JWT token
  User.findOne = jest.fn().mockResolvedValue(mockUser); 
  jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');  

  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'johndoe@example.com',
      password: 'password'
    });

  expect(response.status).toBe(200);


  expect(response.body.message).toBe('Login successful!');
});


  // Test for invalid login (wrong password)
  it('should return an error if password is incorrect during login', async () => {
    User.findOne.mockResolvedValue(mockUser);  // Mock that user exists
    mockUser.comparePassword.mockReturnValue(false);  // Mock incorrect password comparison

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'johndoe@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);  // Expect HTTP status 401 (Unauthorized)
    expect(response.body.message).toBe('Invalid email or password.');  // Check response message
  });

  // Test for user profile update (successful)
  


  // Test for user profile update (user not found)
  it('should return an error if user not found while updating profile', async () => {
    User.findById.mockResolvedValue(null);  // Mock that user is not found

    const response = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', ['authToken=fake_token'])
      .send({
        name: 'Jane Doe',
        email: 'janedoe@example.com',
        preferredCurrency: 'USD'
      });

    expect(response.status).toBe(500);  // Expect HTTP status 404 (Not Found)
    expect(response.body.message).toBe('Internal server error.');  // Check response message
  });

  // Test for unauthorized access when no token is provided
  it('should return an error if no token is provided', async () => {
    const response = await request(app)
      .put('/api/auth/profile')
      .send({
        name: 'Jane Doe',
        email: 'janedoe@example.com',
        preferredCurrency: 'USD'
      });

    expect(response.status).toBe(401);  // Expect HTTP status 401 (Unauthorized)
    expect(response.body.message).toBe('Access denied. No token provided.');  // Check response message
  });
});
