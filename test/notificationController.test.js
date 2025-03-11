const request = require('supertest');
const app = require('../index'); // Adjust path to your app
const Notification = require('../models/Notification');

jest.mock('../models/Notification'); // Mock the Notification model

describe('Notification API', () => {

  // Test for GET /api/notifications
  describe('GET /api/notifications', () => {
    it('should return notifications for the user', async () => {
      const notificationsData = [
        { _id: '1', message: 'Goal updated', read: false, user: 'user1' },
        { _id: '2', message: 'Goal completed', read: false, user: 'user1' },
      ];

      // Mock the Notification.find method
      Notification.find.mockResolvedValue(notificationsData);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer user1-token') // Replace with actual token or mock
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(notificationsData);
      expect(Notification.find).toHaveBeenCalledWith({ user: 'user1' });
    });

    it('should return an error if there is a server issue', async () => {
      Notification.find.mockRejectedValue(new Error('Server error'));

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer user1-token')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error.');
    });
  });

  // Test for PUT /api/notifications/:id/read
  describe('PUT /api/notifications/:id/read', () => {
    it('should mark the notification as read', async () => {
      const notificationData = { _id: '1', message: 'Goal updated', read: false, user: 'user1' };

      // Mock the Notification.findById and save methods
      Notification.findById.mockResolvedValue(notificationData);
      Notification.prototype.save = jest.fn().mockResolvedValue(notificationData);

      const response = await request(app)
        .put('/api/notifications/1/read')
        .set('Authorization', 'Bearer user1-token')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.read).toBe(true);
      expect(Notification.findById).toHaveBeenCalledWith('1');
      expect(Notification.prototype.save).toHaveBeenCalled();
    });

    it('should return an error if notification not found', async () => {
      Notification.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/notifications/1/read')
        .set('Authorization', 'Bearer user1-token')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Notification not found.');
    });

    it('should return an error if user is not authorized', async () => {
      const notificationData = { _id: '1', message: 'Goal updated', read: false, user: 'user2' };
      Notification.findById.mockResolvedValue(notificationData);

      const response = await request(app)
        .put('/api/notifications/1/read')
        .set('Authorization', 'Bearer user1-token')
        .send();

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized.');
    });

    it('should return an error if there is a server issue', async () => {
      Notification.findById.mockRejectedValue(new Error('Server error'));

      const response = await request(app)
        .put('/api/notifications/1/read')
        .set('Authorization', 'Bearer user1-token')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error.');
    });
  });

});
