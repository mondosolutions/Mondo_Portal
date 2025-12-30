const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, role, avatar, company, phone, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
});

// Update user profile
router.put('/profile',
  [
    body('name').optional().trim().notEmpty(),
    body('company').optional().trim(),
    body('phone').optional().trim(),
    body('avatar').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, company, phone, avatar } = req.body;

    try {
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (company !== undefined) {
        updates.push('company = ?');
        values.push(company);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone);
      }
      if (avatar !== undefined) {
        updates.push('avatar = ?');
        values.push(avatar);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push('updated_at = datetime("now")');
      values.push(req.user.id);

      db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      const updatedUser = db.prepare(`
        SELECT id, email, name, role, avatar, company, phone, created_at
        FROM users WHERE id = ?
      `).get(req.user.id);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  }
);

// Get all users (admin only or for email recipient selection)
router.get('/', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, role, avatar, company
      FROM users
      ORDER BY name ASC
    `).all();

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users'
    });
  }
});

module.exports = router;
