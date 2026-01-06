const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all notifications
router.get('/', (req, res) => {
  try {
    const { is_read, limit = 50 } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const notifications = db.prepare(query).all(...params);

    const unreadCount = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(req.user.id);

    res.json({
      success: true,
      notifications,
      unread_count: unreadCount.count
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', (req, res) => {
  try {
    const result = db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// Mark all as read
router.post('/mark-all-read', (req, res) => {
  try {
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).run(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// Delete notification
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
});

module.exports = router;
