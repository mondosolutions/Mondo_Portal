const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all user settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare(`
      SELECT key, value FROM settings
      WHERE user_id = ?
    `).all(req.user.id);

    // Convert to object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving settings'
    });
  }
});

// Get single setting
router.get('/:key', (req, res) => {
  try {
    const setting = db.prepare(`
      SELECT key, value FROM settings
      WHERE user_id = ? AND key = ?
    `).get(req.user.id, req.params.key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      key: setting.key,
      value: setting.value
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving setting'
    });
  }
});

// Update or create setting
router.put('/:key',
  [body('value').notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { value } = req.body;

    try {
      // Use UPSERT (INSERT OR REPLACE)
      db.prepare(`
        INSERT INTO settings (user_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(req.user.id, req.params.key, value, value);

      res.json({
        success: true,
        message: 'Setting updated successfully',
        key: req.params.key,
        value
      });
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating setting'
      });
    }
  }
);

// Batch update settings
router.post('/batch',
  [body('settings').isObject()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { settings } = req.body;

    try {
      const stmt = db.prepare(`
        INSERT INTO settings (user_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET value = ?, updated_at = datetime('now')
      `);

      const updateMany = db.transaction((settings) => {
        for (const [key, value] of Object.entries(settings)) {
          stmt.run(req.user.id, key, value, value);
        }
      });

      updateMany(settings);

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Batch update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating settings'
      });
    }
  }
);

// Delete setting
router.delete('/:key', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM settings WHERE user_id = ? AND key = ?'
    ).run(req.user.id, req.params.key);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting setting'
    });
  }
});

module.exports = router;
