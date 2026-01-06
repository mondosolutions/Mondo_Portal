const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all projects
router.get('/', (req, res) => {
  try {
    const { status, client_id, search } = req.query;
    let query = `
      SELECT p.*, c.name as client_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_tasks
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND p.client_id = ?';
      params.push(client_id);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    const projects = db.prepare(query).all(...params);

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving projects'
    });
  }
});

// Get single project with full details
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get project tasks
    const tasks = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = ?
      ORDER BY t.order_index ASC
    `).all(req.params.id);

    // Get project members
    const members = db.prepare(`
      SELECT pm.*, u.name, u.email, u.avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(req.params.id);

    // Get project milestones
    const milestones = db.prepare(`
      SELECT * FROM milestones
      WHERE project_id = ?
      ORDER BY due_date ASC
    `).all(req.params.id);

    res.json({
      success: true,
      project: {
        ...project,
        tasks,
        members,
        milestones
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving project'
    });
  }
});

// Create project
router.post('/',
  [
    body('name').trim().notEmpty(),
    body('client_id').optional().isInt(),
    body('status').optional().isIn(['active', 'on_hold', 'completed', 'cancelled']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('budget').optional().isFloat({ min: 0 }),
    body('start_date').optional().isDate(),
    body('end_date').optional().isDate()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, client_id, status, priority, budget, start_date, end_date } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO projects (user_id, client_id, name, description, status, priority, budget, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        client_id || null,
        name,
        description || null,
        status || 'active',
        priority || 'medium',
        budget || null,
        start_date || null,
        end_date || null
      );

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating project'
      });
    }
  }
);

// Update project
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(['active', 'on_hold', 'completed', 'cancelled']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('progress').optional().isInt({ min: 0, max: 100 })
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
      const existingProject = db.prepare(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const updates = [];
      const values = [];

      const fields = ['name', 'description', 'client_id', 'status', 'priority', 'budget', 'actual_cost', 'start_date', 'end_date', 'progress'];
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
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
        UPDATE projects SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

      res.json({
        success: true,
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating project'
      });
    }
  }
);

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM projects WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting project'
    });
  }
});

// Get project statistics
router.get('/:id/stats', (req, res) => {
  try {
    const project = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const taskStats = db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(estimated_hours) as estimated_hours,
        SUM(actual_hours) as actual_hours
      FROM tasks WHERE project_id = ?
    `).get(req.params.id);

    const timeStats = db.prepare(`
      SELECT
        SUM(hours) as total_hours,
        SUM(CASE WHEN billable = 1 THEN hours ELSE 0 END) as billable_hours
      FROM time_entries WHERE project_id = ?
    `).get(req.params.id);

    const expenseStats = db.prepare(`
      SELECT SUM(amount) as total_expenses
      FROM expenses WHERE project_id = ?
    `).get(req.params.id);

    res.json({
      success: true,
      stats: {
        ...taskStats,
        ...timeStats,
        total_expenses: expenseStats.total_expenses || 0,
        budget: project.budget,
        actual_cost: project.actual_cost,
        progress: project.progress
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving project statistics'
    });
  }
});

module.exports = router;
