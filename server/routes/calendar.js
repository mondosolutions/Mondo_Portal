const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all events
router.get('/', (req, res) => {
  try {
    const start = req.query.start;
    const end = req.query.end;

    let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
    const params = [req.user.id];

    if (start && end) {
      query += ' AND start >= ? AND end <= ?';
      params.push(start, end);
    }

    query += ' ORDER BY start ASC';

    const events = db.prepare(query).all(...params);

    // Format for FullCalendar
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      allDay: Boolean(event.all_day),
      color: event.color,
      url: event.url
    }));

    res.json({
      success: true,
      events: formattedEvents
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving events'
    });
  }
});

// Get single event
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare(`
      SELECT * FROM calendar_events
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving event'
    });
  }
});

// Create event
router.post('/',
  [
    body('title').trim().notEmpty(),
    body('start').isISO8601(),
    body('end').optional().isISO8601(),
    body('all_day').optional().isBoolean(),
    body('color').optional().trim(),
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

    const { title, description, start, end, all_day, color, url } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO calendar_events
        (user_id, title, description, start, end, all_day, color, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        title,
        description || null,
        start,
        end || null,
        all_day ? 1 : 0,
        color || null,
        url || null
      );

      const event = db.prepare(
        'SELECT * FROM calendar_events WHERE id = ?'
      ).get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating event'
      });
    }
  }
);

// Update event
router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('start').optional().isISO8601(),
    body('end').optional().isISO8601(),
    body('all_day').optional().isBoolean(),
    body('color').optional().trim(),
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

    const { title, description, start, end, all_day, color, url } = req.body;

    try {
      // Check if event exists and belongs to user
      const existingEvent = db.prepare(
        'SELECT id FROM calendar_events WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (start !== undefined) {
        updates.push('start = ?');
        values.push(start);
      }
      if (end !== undefined) {
        updates.push('end = ?');
        values.push(end);
      }
      if (all_day !== undefined) {
        updates.push('all_day = ?');
        values.push(all_day ? 1 : 0);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        values.push(color);
      }
      if (url !== undefined) {
        updates.push('url = ?');
        values.push(url);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push('updated_at = datetime("now")');
      values.push(req.params.id);

      db.prepare(`
        UPDATE calendar_events
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);

      const event = db.prepare(
        'SELECT * FROM calendar_events WHERE id = ?'
      ).get(req.params.id);

      res.json({
        success: true,
        message: 'Event updated successfully',
        event
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating event'
      });
    }
  }
);

// Delete event
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM calendar_events WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event'
    });
  }
});

module.exports = router;
