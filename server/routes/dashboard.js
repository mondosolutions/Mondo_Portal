const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get dashboard overview stats
router.get('/overview', (req, res) => {
  try {
    const userId = req.user.id;

    // Total revenue from transactions
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

    // Project stats
    const projectStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(AVG(progress), 0) as avg_progress
      FROM projects
      WHERE user_id = ?
    `).get(userId);

    // Task stats
    const taskStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status != 'completed' AND t.due_date < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.user_id = ?
    `).get(userId);

    // Client stats
    const clientStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM clients
      WHERE user_id = ?
    `).get(userId);

    // Invoice stats
    const invoiceStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(total), 0) as total_value,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(total - amount_paid), 0) as outstanding,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'sent' OR status = 'partial' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status != 'paid' AND status != 'draft' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status != 'paid' AND status != 'draft' AND due_date < date('now') THEN (total - amount_paid) ELSE 0 END), 0) as overdue_amount
      FROM invoices
      WHERE user_id = ?
    `).get(userId);

    // Time tracking stats (this month)
    const timeStats = db.prepare(`
      SELECT
        COALESCE(SUM(hours), 0) as total_hours,
        COALESCE(SUM(CASE WHEN billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
        COALESCE(SUM(CASE WHEN billable = 1 THEN hours * hourly_rate ELSE 0 END), 0) as billable_revenue
      FROM time_entries
      WHERE user_id = ? AND date >= date('now', 'start of month')
    `).get(userId);

    // Expense stats (this month)
    const expenseStats = db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN billable = 1 THEN amount ELSE 0 END), 0) as billable,
        COALESCE(SUM(CASE WHEN billable = 0 THEN amount ELSE 0 END), 0) as non_billable,
        COUNT(*) as count
      FROM expenses
      WHERE user_id = ? AND date >= date('now', 'start of month')
    `).get(userId);

    // Notification stats
    const notificationStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM notifications
      WHERE user_id = ?
    `).get(userId);

    // Upcoming events (next 7 days)
    const upcomingEvents = db.prepare(`
      SELECT COUNT(*) as count
      FROM calendar_events
      WHERE user_id = ?
        AND start >= datetime('now')
        AND start <= datetime('now', '+7 days')
    `).get(userId);

    // Recent activity (milestones)
    const upcomingMilestones = db.prepare(`
      SELECT COUNT(*) as count
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = ?
        AND m.status = 'pending'
        AND m.due_date <= date('now', '+14 days')
    `).get(userId);

    res.json({
      success: true,
      stats: {
        revenue: {
          total: revenueResult.total,
          transactions: transactionsResult.total
        },
        projects: {
          total: projectStats.total || 0,
          active: projectStats.active || 0,
          completed: projectStats.completed || 0,
          avg_progress: Math.round(projectStats.avg_progress || 0)
        },
        tasks: {
          total: taskStats.total || 0,
          todo: taskStats.todo || 0,
          in_progress: taskStats.in_progress || 0,
          completed: taskStats.completed || 0,
          overdue: taskStats.overdue || 0
        },
        clients: {
          total: clientStats.total || 0,
          active: clientStats.active || 0
        },
        invoices: {
          total: invoiceStats.total || 0,
          total_value: invoiceStats.total_value || 0,
          total_paid: invoiceStats.total_paid || 0,
          outstanding: invoiceStats.outstanding || 0,
          paid_count: invoiceStats.paid_count || 0,
          pending_count: invoiceStats.pending_count || 0,
          overdue_count: invoiceStats.overdue_count || 0,
          overdue_amount: invoiceStats.overdue_amount || 0
        },
        time: {
          total_hours: timeStats.total_hours || 0,
          billable_hours: timeStats.billable_hours || 0,
          billable_revenue: timeStats.billable_revenue || 0
        },
        expenses: {
          total: expenseStats.total || 0,
          billable: expenseStats.billable || 0,
          non_billable: expenseStats.non_billable || 0,
          count: expenseStats.count || 0
        },
        notifications: {
          total: notificationStats.total || 0,
          unread: notificationStats.unread || 0
        },
        upcoming: {
          events: upcomingEvents.count || 0,
          milestones: upcomingMilestones.count || 0
        }
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
