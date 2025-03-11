const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');


// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post("/logout", authController.logout);

// Protected routes
router.get('/profile',authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;