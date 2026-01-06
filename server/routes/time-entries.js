const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all time entries
router.get('/', (req, res) => {
  try {
    const { project_id, task_id, start_date, end_date, billable } = req.query;

    let query = `
      SELECT te.*, p.name as project_name, t.title as task_title
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.user_id = ?
    `;
    const params = [req.user.id];

    if (project_id) {
      query += ' AND te.project_id = ?';
      params.push(project_id);
    }

    if (task_id) {
      query += ' AND te.task_id = ?';
      params.push(task_id);
    }

    if (start_date) {
      query += ' AND te.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND te.date <= ?';
      params.push(end_date);
    }

    if (billable !== undefined) {
      query += ' AND te.billable = ?';
      params.push(billable === 'true' ? 1 : 0);
    }

    query += ' ORDER BY te.date DESC, te.created_at DESC';

    const entries = db.prepare(query).all(...params);

    // Calculate totals
    const totals = entries.reduce((acc, entry) => {
      acc.total_hours += entry.hours;
      if (entry.billable) {
        acc.billable_hours += entry.hours;
        if (entry.hourly_rate) {
          acc.total_amount += entry.hours * entry.hourly_rate;
        }
      }
      return acc;
    }, { total_hours: 0, billable_hours: 0, total_amount: 0 });

    res.json({
      success: true,
      entries,
      totals
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving time entries'
    });
  }
});

// Get single time entry
router.get('/:id', (req, res) => {
  try {
    const entry = db.prepare(`
      SELECT te.*, p.name as project_name, t.title as task_title
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = ? AND te.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    res.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving time entry'
    });
  }
});

// Create time entry
router.post('/',
  [
    body('hours').isFloat({ min: 0 }),
    body('date').isDate(),
    body('project_id').optional().isInt(),
    body('task_id').optional().isInt(),
    body('billable').optional().isBoolean(),
    body('hourly_rate').optional().isFloat({ min: 0 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { project_id, task_id, description, hours, billable, hourly_rate, date } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO time_entries (user_id, project_id, task_id, description, hours, billable, hourly_rate, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        project_id || null,
        task_id || null,
        description || null,
        hours,
        billable === false ? 0 : 1,
        hourly_rate || null,
        date
      );

      // Update task actual hours if task_id is provided
      if (task_id) {
        db.prepare(`
          UPDATE tasks
          SET actual_hours = (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE task_id = ?)
          WHERE id = ?
        `).run(task_id, task_id);
      }

      const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Time entry created successfully',
        entry
      });
    } catch (error) {
      console.error('Create time entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating time entry'
      });
    }
  }
);

// Update time entry
router.put('/:id',
  [
    body('hours').optional().isFloat({ min: 0 }),
    body('date').optional().isDate(),
    body('billable').optional().isBoolean(),
    body('hourly_rate').optional().isFloat({ min: 0 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const existingEntry = db.prepare(
        'SELECT * FROM time_entries WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found'
        });
      }

      const updates = [];
      const values = [];

      const fields = ['project_id', 'task_id', 'description', 'hours', 'billable', 'hourly_rate', 'date'];
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          if (field === 'billable') {
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
        UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      // Update task actual hours if task is involved
      if (existingEntry.task_id || req.body.task_id) {
        const taskId = req.body.task_id || existingEntry.task_id;
        db.prepare(`
          UPDATE tasks
          SET actual_hours = (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE task_id = ?)
          WHERE id = ?
        `).run(taskId, taskId);
      }

      const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);

      res.json({
        success: true,
        message: 'Time entry updated successfully',
        entry
      });
    } catch (error) {
      console.error('Update time entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating time entry'
      });
    }
  }
);

// Delete time entry
router.delete('/:id', (req, res) => {
  try {
    const entry = db.prepare(
      'SELECT * FROM time_entries WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    db.prepare('DELETE FROM time_entries WHERE id = ?').run(req.params.id);

    // Update task actual hours if task was involved
    if (entry.task_id) {
      db.prepare(`
        UPDATE tasks
        SET actual_hours = (SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE task_id = ?)
        WHERE id = ?
      `).run(entry.task_id, entry.task_id);
    }

    res.json({
      success: true,
      message: 'Time entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting time entry'
    });
  }
});

// Get time summary by project
router.get('/summary/by-project', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        p.id as project_id,
        p.name as project_name,
        SUM(te.hours) as total_hours,
        SUM(CASE WHEN te.billable = 1 THEN te.hours ELSE 0 END) as billable_hours,
        SUM(CASE WHEN te.billable = 1 AND te.hourly_rate IS NOT NULL
            THEN te.hours * te.hourly_rate ELSE 0 END) as total_amount
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = ?
    `;
    const params = [req.user.id];

    if (start_date) {
      query += ' AND te.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND te.date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY p.id, p.name ORDER BY total_hours DESC';

    const summary = db.prepare(query).all(...params);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Get time summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving time summary'
    });
  }
});

module.exports = router;
