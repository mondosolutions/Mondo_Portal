const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all expenses
router.get('/', (req, res) => {
  try {
    const { project_id, client_id, category, billable, start_date, end_date } = req.query;

    let query = `
      SELECT e.*, p.name as project_name, c.name as client_name
      FROM expenses e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];

    if (project_id) {
      query += ' AND e.project_id = ?';
      params.push(project_id);
    }

    if (client_id) {
      query += ' AND e.client_id = ?';
      params.push(client_id);
    }

    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }

    if (billable !== undefined) {
      query += ' AND e.billable = ?';
      params.push(billable === 'true' ? 1 : 0);
    }

    if (start_date) {
      query += ' AND e.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND e.date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY e.date DESC';

    const expenses = db.prepare(query).all(...params);

    // Calculate totals
    const totals = expenses.reduce((acc, expense) => {
      acc.total += expense.amount;
      if (expense.billable) acc.billable += expense.amount;
      if (expense.invoiced) acc.invoiced += expense.amount;
      return acc;
    }, { total: 0, billable: 0, invoiced: 0 });

    res.json({
      success: true,
      expenses,
      totals
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving expenses'
    });
  }
});

// Get single expense
router.get('/:id', (req, res) => {
  try {
    const expense = db.prepare(`
      SELECT e.*, p.name as project_name, c.name as client_name
      FROM expenses e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.id = ? AND e.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving expense'
    });
  }
});

// Create expense
router.post('/',
  [
    body('category').trim().notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('date').isDate(),
    body('project_id').optional().isInt(),
    body('client_id').optional().isInt(),
    body('billable').optional().isBoolean()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { project_id, client_id, category, amount, date, description, receipt_url, billable, invoiced } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO expenses (user_id, project_id, client_id, category, amount, date, description, receipt_url, billable, invoiced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        project_id || null,
        client_id || null,
        category,
        amount,
        date,
        description || null,
        receipt_url || null,
        billable ? 1 : 0,
        invoiced ? 1 : 0
      );

      const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        expense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating expense'
      });
    }
  }
);

// Update expense
router.put('/:id', (req, res) => {
  try {
    const existingExpense = db.prepare(
      'SELECT id FROM expenses WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const updates = [];
    const values = [];

    const fields = ['project_id', 'client_id', 'category', 'amount', 'date', 'description', 'receipt_url', 'billable', 'invoiced'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'billable' || field === 'invoiced') {
          values.push(req.body[field] ? 1 : 0);
        } else {
          values.push(req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = datetime("now")');
    values.push(req.params.id);

    db.prepare(`
      UPDATE expenses SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating expense'
    });
  }
});

// Delete expense
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense'
    });
  }
});

// Get expense categories
router.get('/meta/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category
      FROM expenses
      WHERE user_id = ?
      ORDER BY category ASC
    `).all(req.user.id);

    res.json({
      success: true,
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving categories'
    });
  }
});

module.exports = router;
