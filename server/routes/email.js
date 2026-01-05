const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get inbox emails
router.get('/inbox', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const emails = db.prepare(`
      SELECT
        e.*,
        u.name as sender_name,
        u.email as sender_email,
        u.avatar as sender_avatar
      FROM emails e
      JOIN users u ON e.from_user_id = u.id
      WHERE e.to_user_id = ? AND e.is_draft = 0 AND e.is_archived = 0
      ORDER BY e.sent_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM emails
      WHERE to_user_id = ? AND is_draft = 0 AND is_archived = 0
    `).get(req.user.id);

    res.json({
      success: true,
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving inbox'
    });
  }
});

// Get sent emails
router.get('/sent', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const emails = db.prepare(`
      SELECT
        e.*,
        u.name as recipient_name,
        u.email as recipient_email
      FROM emails e
      JOIN users u ON e.to_user_id = u.id
      WHERE e.from_user_id = ? AND e.is_draft = 0
      ORDER BY e.sent_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) as total FROM emails
      WHERE from_user_id = ? AND is_draft = 0
    `).get(req.user.id);

    res.json({
      success: true,
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving sent emails'
    });
  }
});

// Get drafts
router.get('/drafts', (req, res) => {
  try {
    const drafts = db.prepare(`
      SELECT * FROM emails
      WHERE from_user_id = ? AND is_draft = 1
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      drafts
    });
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving drafts'
    });
  }
});

// Get starred emails
router.get('/starred', (req, res) => {
  try {
    const emails = db.prepare(`
      SELECT
        e.*,
        u.name as sender_name,
        u.email as sender_email,
        u.avatar as sender_avatar
      FROM emails e
      JOIN users u ON e.from_user_id = u.id
      WHERE (e.to_user_id = ? OR e.from_user_id = ?) AND e.is_starred = 1
      ORDER BY e.sent_at DESC
    `).all(req.user.id, req.user.id);

    res.json({
      success: true,
      emails
    });
  } catch (error) {
    console.error('Get starred emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving starred emails'
    });
  }
});

// Get single email
router.get('/:id', (req, res) => {
  try {
    const email = db.prepare(`
      SELECT
        e.*,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.avatar as sender_avatar,
        recipient.name as recipient_name,
        recipient.email as recipient_email
      FROM emails e
      JOIN users sender ON e.from_user_id = sender.id
      JOIN users recipient ON e.to_user_id = recipient.id
      WHERE e.id = ? AND (e.to_user_id = ? OR e.from_user_id = ?)
    `).get(req.params.id, req.user.id, req.user.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Mark as read if recipient is viewing
    if (email.to_user_id === req.user.id && !email.is_read) {
      db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(req.params.id);
      email.is_read = 1;
    }

    res.json({
      success: true,
      email
    });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving email'
    });
  }
});

// Send/compose email
router.post('/',
  [
    body('to_user_id').isInt(),
    body('subject').trim().notEmpty(),
    body('body').trim().notEmpty(),
    body('is_draft').optional().isBoolean()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { to_user_id, subject, body, is_draft } = req.body;

    try {
      // Check if recipient exists
      const recipient = db.prepare('SELECT id FROM users WHERE id = ?').get(to_user_id);

      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Recipient not found'
        });
      }

      const result = db.prepare(`
        INSERT INTO emails
        (from_user_id, to_user_id, subject, body, is_draft)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        to_user_id,
        subject,
        body,
        is_draft ? 1 : 0
      );

      const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: is_draft ? 'Draft saved successfully' : 'Email sent successfully',
        email
      });
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending email'
      });
    }
  }
);

// Update email (star, mark as read, archive, etc.)
router.patch('/:id',
  [
    body('is_read').optional().isBoolean(),
    body('is_starred').optional().isBoolean(),
    body('is_archived').optional().isBoolean()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { is_read, is_starred, is_archived } = req.body;

    try {
      // Check if email exists and user has access
      const email = db.prepare(
        'SELECT * FROM emails WHERE id = ? AND (to_user_id = ? OR from_user_id = ?)'
      ).get(req.params.id, req.user.id, req.user.id);

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      const updates = [];
      const values = [];

      if (is_read !== undefined) {
        updates.push('is_read = ?');
        values.push(is_read ? 1 : 0);
      }
      if (is_starred !== undefined) {
        updates.push('is_starred = ?');
        values.push(is_starred ? 1 : 0);
      }
      if (is_archived !== undefined) {
        updates.push('is_archived = ?');
        values.push(is_archived ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(req.params.id);

      db.prepare(`
        UPDATE emails SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      const updatedEmail = db.prepare('SELECT * FROM emails WHERE id = ?').get(req.params.id);

      res.json({
        success: true,
        message: 'Email updated successfully',
        email: updatedEmail
      });
    } catch (error) {
      console.error('Update email error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating email'
      });
    }
  }
);

// Delete email
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM emails WHERE id = ? AND (to_user_id = ? OR from_user_id = ?)'
    ).run(req.params.id, req.user.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    res.json({
      success: true,
      message: 'Email deleted successfully'
    });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting email'
    });
  }
});

// Get unread count
router.get('/count/unread', (req, res) => {
  try {
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM emails
      WHERE to_user_id = ? AND is_read = 0 AND is_draft = 0
    `).get(req.user.id);

    res.json({
      success: true,
      unread: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread count'
    });
  }
});

module.exports = router;
