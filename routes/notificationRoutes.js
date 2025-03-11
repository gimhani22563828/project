const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorizeResource } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/',notificationController.getNotifications);
router.put('/:id/read',notificationController.markNotificationAsRead);
module.exports = router;