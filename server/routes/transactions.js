const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all transactions
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const type = req.query.type;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?';
    const countParams = [req.user.id];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving transactions'
    });
  }
});

// Get single transaction
router.get('/:id', (req, res) => {
  try {
    const transaction = db.prepare(`
      SELECT * FROM transactions
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving transaction'
    });
  }
});

// Create transaction
router.post('/',
  [
    body('amount').isFloat({ min: 0 }),
    body('type').isIn(['income', 'expense']),
    body('status').isIn(['pending', 'completed', 'failed', 'cancelled']),
    body('description').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, type, status, description } = req.body;
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    try {
      const result = db.prepare(`
        INSERT INTO transactions
        (user_id, transaction_id, amount, type, status, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        transactionId,
        amount,
        type,
        status,
        description || null
      );

      const transaction = db.prepare(
        'SELECT * FROM transactions WHERE id = ?'
      ).get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        transaction
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating transaction'
      });
    }
  }
);

// Update transaction
router.put('/:id',
  [
    body('amount').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']),
    body('description').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, status, description } = req.body;

    try {
      // Check if transaction exists and belongs to user
      const existingTransaction = db.prepare(
        'SELECT id FROM transactions WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      const updates = [];
      const values = [];

      if (amount !== undefined) {
        updates.push('amount = ?');
        values.push(amount);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(req.params.id);

      db.prepare(`
        UPDATE transactions
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);

      const transaction = db.prepare(
        'SELECT * FROM transactions WHERE id = ?'
      ).get(req.params.id);

      res.json({
        success: true,
        message: 'Transaction updated successfully',
        transaction
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating transaction'
      });
    }
  }
);

// Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction'
    });
  }
});

module.exports = router;
