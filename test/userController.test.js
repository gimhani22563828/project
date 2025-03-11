const mongoose = require('mongoose');
const User = require('../models/User');
const userController = require('../controllers/userController');
const httpMocks = require('node-mocks-http');

jest.mock('../models/User'); // Mocking the User model

let mockUser;
let request;
let response;

beforeAll(() => {
  // Establishing the connection to MongoDB if needed
  // You can add your DB connection logic here
});

beforeEach(() => {
  // Create a mock user
  mockUser = {
    _id: new mongoose.Types.ObjectId(), // Using the `new` keyword to fix the error
    name: 'John Doe',
    email: 'johndoe@example.com',
    role: 'admin',
    isActive: true,
    preferredCurrency: 'USD',
    save: jest.fn().mockResolvedValue(mockUser),
  };

  // Mock User.find() and User.findById()
  User.find.mockResolvedValue([mockUser]); // Mocking the response for find
  User.findById.mockResolvedValue(mockUser); // Mocking the response for findById

  // Creating mock request and response objects
  request = httpMocks.createRequest();
  response = httpMocks.createResponse();
});

afterEach(() => {
  jest.clearAllMocks(); // Clearing mocks after each test
});

afterAll(() => {
  // Disconnect DB if needed after tests
  // You can add your DB disconnection logic here
});

// Test for fetching all users (admin only)
test('should fetch all users (admin only)', async () => {
  request.user = { role: 'admin' }; // Mocking an admin user
  await userController.getAllUsers(request, response);
  expect(response.statusCode).toBe(200);
  expect(response._getData()).toEqual([mockUser]);
});

// Test for fetching user by ID (admin only)
test('should fetch user by ID', async () => {
  request.params = { id: mockUser._id }; // Setting the user ID in params
  request.user = { role: 'admin' }; // Mocking an admin user

  await userController.getUserById(request, response);
  expect(response.statusCode).toBe(200);
  expect(response._getData()).toEqual(mockUser);
});

// Test for user not found by ID
test('should return 404 if user not found by ID', async () => {
  User.findById.mockResolvedValue(null); // Mocking user not found

  request.params = { id: mockUser._id };
  request.user = { role: 'admin' };

  await userController.getUserById(request, response);
  expect(response.statusCode).toBe(404);
  expect(response._getData()).toEqual({ message: 'User not found.' });
});

// Test for updating user details
test('should update user details', async () => {
  const updatedUser = { ...mockUser, name: 'Jane Doe' };
  mockUser.save.mockResolvedValue(updatedUser); // Mock saving the updated user

  request.params = { id: mockUser._id };
  request.body = { name: 'Jane Doe' };
  request.user = { role: 'admin' };

  await userController.updateUser(request, response);
  expect(response.statusCode).toBe(200);
  expect(response._getData().name).toBe('Jane Doe');
});

// Test for user not found when updating
test('should return 404 if user not found when updating', async () => {
  User.findById.mockResolvedValue(null);

  request.params = { id: mockUser._id };
  request.body = { name: 'Jane Doe' };
  request.user = { role: 'admin' };

  await userController.updateUser(request, response);
  expect(response.statusCode).toBe(404);
  expect(response._getData()).toEqual({ message: 'User not found.' });
});

// Test for deactivating user
test('should deactivate user', async () => {
  mockUser.save.mockResolvedValue(mockUser); // Mock saving the deactivated user

  request.params = { id: mockUser._id };
  request.user = { role: 'admin' };

  await userController.deleteUser(request, response);
  expect(response.statusCode).toBe(200);
  expect(response._getData()).toEqual({ message: 'User deactivated.' });
});

// Test for user not found when deactivating
test('should return 404 if user not found when deactivating', async () => {
  User.findById.mockResolvedValue(null);

  request.params = { id: mockUser._id };
  request.user = { role: 'admin' };

  await userController.deleteUser(request, response);
  expect(response.statusCode).toBe(404);
  expect(response._getData()).toEqual({ message: 'User not found.' });
});

// Test for resetting user password
test('should reset user password', async () => {
  request.params = { id: mockUser._id };
  request.body = { newPassword: 'newpassword123' };
  request.user = { role: 'admin' };

  await userController.resetPassword(request, response);
  expect(response.statusCode).toBe(200);
  expect(response._getData()).toEqual({ message: 'Password reset successfully.' });
});

// Test for user not found when resetting password
test('should return 404 if user not found when resetting password', async () => {
  User.findById.mockResolvedValue(null);

  request.params = { id: mockUser._id };
  request.body = { newPassword: 'newpassword123' };
  request.user = { role: 'admin' };

  await userController.resetPassword(request, response);
  expect(response.statusCode).toBe(404);
  expect(response._getData()).toEqual({ message: 'User not found.' });
});
