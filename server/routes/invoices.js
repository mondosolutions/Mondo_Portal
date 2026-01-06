const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Generate invoice number
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

// Get all invoices
router.get('/', (req, res) => {
  try {
    const { status, client_id, project_id } = req.query;

    let query = `
      SELECT i.*, c.name as client_name, p.name as project_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND i.client_id = ?';
      params.push(client_id);
    }

    if (project_id) {
      query += ' AND i.project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY i.created_at DESC';

    const invoices = db.prepare(query).all(...params);

    res.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving invoices'
    });
  }
});

// Get single invoice
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address,
             c.city as client_city, c.state as client_state, c.zip as client_zip,
             p.name as project_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get invoice items
    const items = db.prepare(`
      SELECT * FROM invoice_items
      WHERE invoice_id = ?
    `).all(req.params.id);

    // Get payments
    const payments = db.prepare(`
      SELECT * FROM payments
      WHERE invoice_id = ?
      ORDER BY payment_date DESC
    `).all(req.params.id);

    res.json({
      success: true,
      invoice: {
        ...invoice,
        items,
        payments
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving invoice'
    });
  }
});

// Create invoice
router.post('/',
  [
    body('client_id').isInt(),
    body('issue_date').isDate(),
    body('due_date').isDate(),
    body('items').isArray({ min: 1 }),
    body('items.*.description').trim().notEmpty(),
    body('items.*.quantity').isFloat({ min: 0 }),
    body('items.*.rate').isFloat({ min: 0 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { client_id, project_id, issue_date, due_date, items, tax_rate, discount_amount, notes, terms } = req.body;

    try {
      // Verify client ownership
      const client = db.prepare(
        'SELECT id FROM clients WHERE id = ? AND user_id = ?'
      ).get(client_id, req.user.id);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Calculate totals
      let subtotal = 0;
      items.forEach(item => {
        item.amount = item.quantity * item.rate;
        subtotal += item.amount;
      });

      const taxAmount = (subtotal * (tax_rate || 0)) / 100;
      const total = subtotal + taxAmount - (discount_amount || 0);

      // Generate invoice number
      let invoiceNumber;
      let attempts = 0;
      while (attempts < 10) {
        invoiceNumber = generateInvoiceNumber();
        const existing = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber);
        if (!existing) break;
        attempts++;
      }

      // Insert invoice
      const result = db.prepare(`
        INSERT INTO invoices (user_id, client_id, project_id, invoice_number, status, issue_date, due_date,
                             subtotal, tax_rate, tax_amount, discount_amount, total, notes, terms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        client_id,
        project_id || null,
        invoiceNumber,
        'draft',
        issue_date,
        due_date,
        subtotal,
        tax_rate || 0,
        taxAmount,
        discount_amount || 0,
        total,
        notes || null,
        terms || null
      );

      const invoiceId = result.lastInsertRowid;

      // Insert invoice items
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?)
      `);

      items.forEach(item => {
        insertItem.run(invoiceId, item.description, item.quantity, item.rate, item.amount);
      });

      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        invoice
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating invoice'
      });
    }
  }
);

// Update invoice
router.put('/:id', (req, res) => {
  try {
    const existingInvoice = db.prepare(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const updates = [];
    const values = [];

    const fields = ['status', 'issue_date', 'due_date', 'notes', 'terms'];
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
      UPDATE invoices SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice'
    });
  }
});

// Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM invoices WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice'
    });
  }
});

// Add payment to invoice
router.post('/:id/payments',
  [
    body('amount').isFloat({ min: 0 }),
    body('payment_date').isDate(),
    body('payment_method').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, payment_date, payment_method, transaction_id, notes } = req.body;

    try {
      const invoice = db.prepare(
        'SELECT * FROM invoices WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      // Insert payment
      const result = db.prepare(`
        INSERT INTO payments (invoice_id, amount, payment_date, payment_method, transaction_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.params.id,
        amount,
        payment_date,
        payment_method || null,
        transaction_id || null,
        notes || null
      );

      // Update invoice paid amount
      const newAmountPaid = invoice.amount_paid + amount;
      db.prepare('UPDATE invoices SET amount_paid = ? WHERE id = ?').run(newAmountPaid, req.params.id);

      // Update status if fully paid
      if (newAmountPaid >= invoice.total) {
        db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', req.params.id);
      } else if (newAmountPaid > 0) {
        db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('partial', req.params.id);
      }

      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Payment added successfully',
        payment
      });
    } catch (error) {
      console.error('Add payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding payment'
      });
    }
  }
);

module.exports = router;
