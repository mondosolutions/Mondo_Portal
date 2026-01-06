const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all clients
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT c.*,
      (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as project_count,
      (SELECT COUNT(*) FROM invoices WHERE client_id = c.id) as invoice_count
      FROM clients c
      WHERE c.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.name ASC';

    const clients = db.prepare(query).all(...params);

    res.json({
      success: true,
      clients
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving clients'
    });
  }
});

// Get single client
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare(`
      SELECT * FROM clients
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get client projects
    const projects = db.prepare(`
      SELECT * FROM projects
      WHERE client_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    // Get client invoices
    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE client_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({
      success: true,
      client: {
        ...client,
        projects,
        invoices
      }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving client'
    });
  }
});

// Create client
router.post('/',
  [
    body('name').trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, phone, company, address, city, state, zip, country, notes, status } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO clients (user_id, name, email, phone, company, address, city, state, zip, country, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        name,
        email || null,
        phone || null,
        company || null,
        address || null,
        city || null,
        state || null,
        zip || null,
        country || null,
        notes || null,
        status || 'active'
      );

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        client
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating client'
      });
    }
  }
);

// Update client
router.put('/:id', (req, res) => {
  try {
    const existingClient = db.prepare(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const updates = [];
    const values = [];

    const fields = ['name', 'email', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country', 'notes', 'status'];
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
      UPDATE clients SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating client'
    });
  }
});

// Delete client
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM clients WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting client'
    });
  }
});

module.exports = router;
