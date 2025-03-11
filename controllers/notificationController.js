const Notification = require('../models/Notification');

// @desc    Get notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
      const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
  
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  };

  // @desc    Mark notification as read
  // @route   PUT /api/notifications/:id/read
  // @access  Private
  exports.markNotificationAsRead = async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);
  
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found.' });
      }
  
      if (notification.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized.' });
      }
  
      notification.read = true;
      await notification.save();
  
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  };