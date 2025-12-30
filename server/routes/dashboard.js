const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get dashboard overview stats
router.get('/overview', (req, res) => {
  try {
    const userId = req.user.id;

    // Total revenue
    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'income' AND status = 'completed'
    `).get(userId);

    // Total transactions
    const transactionsResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM transactions
      WHERE user_id = ?
    `).get(userId);

    // Active projects
    const projectsResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM projects
      WHERE user_id = ? AND status = 'active'
    `).get(userId);

    // Pending tasks (using calendar events as tasks)
    const tasksResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM calendar_events
      WHERE user_id = ? AND start >= datetime('now')
    `).get(userId);

    res.json({
      success: true,
      stats: {
        revenue: revenueResult.total,
        transactions: transactionsResult.total,
        projects: projectsResult.total,
        tasks: tasksResult.total
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard data'
    });
  }
});

// Get recent transactions
router.get('/recent-transactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const transactions = db.prepare(`
      SELECT id, transaction_id, amount, status, type, description, date
      FROM transactions
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT ?
    `).all(req.user.id, limit);

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving transactions'
    });
  }
});

// Get sales chart data
router.get('/sales-chart', (req, res) => {
  try {
    const period = req.query.period || 'month'; // day, week, month, year
    let dateFormat, limit;

    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d %H:00:00';
        limit = 24;
        break;
      case 'week':
        dateFormat = '%Y-%m-%d';
        limit = 7;
        break;
      case 'year':
        dateFormat = '%Y-%m';
        limit = 12;
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m-%d';
        limit = 30;
        break;
    }

    const salesData = db.prepare(`
      SELECT
        strftime(?, date) as period,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = ? AND date >= datetime('now', '-${limit} ${period}s')
      GROUP BY period
      ORDER BY period ASC
    `).all(dateFormat, req.user.id);

    res.json({
      success: true,
      data: salesData
    });
  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving sales data'
    });
  }
});

// Get analytics metrics
router.get('/analytics', (req, res) => {
  try {
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0];

    const metrics = db.prepare(`
      SELECT metric_type, metric_key, value, date
      FROM analytics
      WHERE (user_id = ? OR user_id IS NULL)
        AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `).all(req.user.id, startDate, endDate);

    // Group by metric type
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push({
        key: metric.metric_key,
        value: metric.value,
        date: metric.date
      });
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: grouped
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving analytics'
    });
  }
});

module.exports = router;
