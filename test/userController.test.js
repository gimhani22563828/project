const mongoose = require('mongoose');
const User = require('../models/User');
const userController = require('../controllers/userController');
const { createRequest, createResponse } = require('node-mocks-http');
const bcrypt = require('bcryptjs');

jest.mock('../models/User');
jest.mock('bcryptjs');

describe('User Controller Tests', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'John Doe',
      email: 'johndoe@example.com',
      role: 'admin',
      isActive: true,
      preferredCurrency: 'USD',
      password: 'originalPassword',
      save: jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      })
    };

    // Mock implementations
    User.find.mockResolvedValue([{ ...mockUser, password: undefined }]);
    User.findById.mockImplementation((id) => 
      id === mockUser._id.toString() ? 
      Promise.resolve({ ...mockUser, password: undefined }) : 
      Promise.resolve(null)
    );
    User.findByIdAndUpdate.mockImplementation((id, update) => {
      if (id === mockUser._id.toString()) {
        Object.assign(mockUser, update);
        return Promise.resolve(mockUser);
      }
      return Promise.resolve(null);
    });
    bcrypt.hash.mockResolvedValue('hashedPassword');
  });

  afterEach(() => jest.clearAllMocks());

  test('Fetch all users (admin only)', async () => {
    const req = createRequest({ user: { role: 'admin' } });
    const res = createResponse();

    await userController.getAllUsers(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual([expect.objectContaining({
      name: 'John Doe',
      email: 'johndoe@example.com'
    })]);
  });

  test('Fetch user by ID', async () => {
    const req = createRequest({
      params: { id: mockUser._id },
      user: { role: 'admin' }
    });
    const res = createResponse();

    await userController.getUserById(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      _id: mockUser._id.toString(),
      name: 'John Doe'
    }));
  });

  test('Update user details', async () => {
    const req = createRequest({
      params: { id: mockUser._id },
      body: { name: 'Jane Doe' },
      user: { role: 'admin' }
    });
    const res = createResponse();

    await userController.updateUser(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      { name: 'Jane Doe' },
      { new: true }
    );
    expect(res.statusCode).toBe(200);
  });

  test('Deactivate user', async () => {
    const req = createRequest({
      params: { id: mockUser._id },
      user: { role: 'admin' }
    });
    const res = createResponse();

    await userController.deleteUser(req, res);
    mockUser.isActive = false;
    expect(mockUser.isActive).toBe(false);
    expect(res.statusCode).toBe(200);
  });

  test('Reset user password', async () => {
    const req = createRequest({
      params: { id: mockUser._id },
      body: { newPassword: 'newSecure123!' },
      user: { role: 'admin' }
    });
    const res = createResponse();

    await userController.resetPassword(req, res);
    expect(bcrypt.hash).toHaveBeenCalledWith('newSecure123!', 10);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      mockUser._id,
      { password: 'hashedPassword' }
    );
    expect(res.statusCode).toBe(200);
  });
});