const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all tasks
router.get('/', (req, res) => {
  try {
    const { project_id, status, assigned_to, search } = req.query;

    let query = `
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE p.user_id = ?
    `;
    const params = [req.user.id];

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.due_date ASC, t.order_index ASC';

    const tasks = db.prepare(query).all(...params);

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tasks'
    });
  }
});

// Get single task with details
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get task comments
    const comments = db.prepare(`
      SELECT tc.*, u.name as user_name, u.avatar
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).all(req.params.id);

    // Get subtasks
    const subtasks = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.parent_task_id = ?
      ORDER BY t.order_index ASC
    `).all(req.params.id);

    res.json({
      success: true,
      task: {
        ...task,
        comments,
        subtasks
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving task'
    });
  }
});

// Create task
router.post('/',
  [
    body('project_id').isInt(),
    body('title').trim().notEmpty(),
    body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'completed', 'blocked']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assigned_to').optional().isInt(),
    body('parent_task_id').optional().isInt(),
    body('estimated_hours').optional().isFloat({ min: 0 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { project_id, parent_task_id, assigned_to, title, description, status, priority, due_date, estimated_hours } = req.body;

    try {
      // Verify project ownership
      const project = db.prepare(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?'
      ).get(project_id, req.user.id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const result = db.prepare(`
        INSERT INTO tasks (project_id, parent_task_id, assigned_to, title, description, status, priority, due_date, estimated_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        project_id,
        parent_task_id || null,
        assigned_to || null,
        title,
        description || null,
        status || 'todo',
        priority || 'medium',
        due_date || null,
        estimated_hours || null
      );

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating task'
      });
    }
  }
);

// Update task
router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'completed', 'blocked']),
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
      const existingTask = db.prepare(`
        SELECT t.id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND p.user_id = ?
      `).get(req.params.id, req.user.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const updates = [];
      const values = [];

      const fields = ['title', 'description', 'assigned_to', 'status', 'priority', 'due_date', 'estimated_hours', 'actual_hours', 'progress', 'order_index'];
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
        UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

      res.json({
        success: true,
        message: 'Task updated successfully',
        task
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating task'
      });
    }
  }
);

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.id FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
});

// Add comment to task
router.post('/:id/comments',
  [body('comment').trim().notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { comment } = req.body;

    try {
      const task = db.prepare(`
        SELECT t.id FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ? AND p.user_id = ?
      `).get(req.params.id, req.user.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const result = db.prepare(`
        INSERT INTO task_comments (task_id, user_id, comment)
        VALUES (?, ?, ?)
      `).run(req.params.id, req.user.id, comment);

      const newComment = db.prepare(`
        SELECT tc.*, u.name as user_name, u.avatar
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment: newComment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding comment'
      });
    }
  }
);

module.exports = router;
