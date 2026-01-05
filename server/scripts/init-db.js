const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Ensure data directory exists BEFORE loading the database module
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const { db, initializeDatabase } = require('../config/database');

// Initialize database
console.log('Initializing database...');
initializeDatabase();

// Create demo admin user
async function createDemoData() {
  console.log('Creating demo data...');

  // Check if any users exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (existingUsers.count > 0) {
    console.log('Demo data already exists. Skipping...');
    return;
  }

  // Create demo users
  const password = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'admin@mondosolutions.com',
      password,
      name: 'Admin User',
      role: 'admin',
      company: 'Mondo Solutions'
    },
    {
      email: 'client@example.com',
      password,
      name: 'Demo Client',
      role: 'client',
      company: 'Example Corp'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (email, password, name, role, company)
    VALUES (?, ?, ?, ?, ?)
  `);

  const userIds = [];

  for (const user of users) {
    const result = insertUser.run(
      user.email,
      user.password,
      user.name,
      user.role,
      user.company
    );
    userIds.push(result.lastInsertRowid);
    console.log(`Created user: ${user.email}`);
  }

  // Create demo transactions
  const transactions = [
    {
      user_id: userIds[1],
      transaction_id: 'TXN-001',
      amount: 5000,
      type: 'income',
      status: 'completed',
      description: 'Marketing Campaign Payment',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userIds[1],
      transaction_id: 'TXN-002',
      amount: 3500,
      type: 'income',
      status: 'completed',
      description: 'SEO Services Payment',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userIds[1],
      transaction_id: 'TXN-003',
      amount: 2000,
      type: 'expense',
      status: 'completed',
      description: 'Ad Spend - Google Ads',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userIds[1],
      transaction_id: 'TXN-004',
      amount: 4500,
      type: 'income',
      status: 'pending',
      description: 'Social Media Campaign',
      date: new Date().toISOString()
    }
  ];

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (user_id, transaction_id, amount, type, status, description, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const txn of transactions) {
    insertTransaction.run(
      txn.user_id,
      txn.transaction_id,
      txn.amount,
      txn.type,
      txn.status,
      txn.description,
      txn.date
    );
  }

  console.log('Created demo transactions');

  // Create demo calendar events
  const events = [
    {
      user_id: userIds[1],
      title: 'Client Meeting',
      description: 'Monthly review meeting',
      start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      all_day: 0,
      color: '#4CAF50'
    },
    {
      user_id: userIds[1],
      title: 'Campaign Launch',
      description: 'Q1 Marketing Campaign',
      start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      all_day: 1,
      color: '#2196F3'
    }
  ];

  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (user_id, title, description, start, end, all_day, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const event of events) {
    insertEvent.run(
      event.user_id,
      event.title,
      event.description,
      event.start,
      event.end,
      event.all_day,
      event.color
    );
  }

  console.log('Created demo calendar events');

  // Create demo analytics
  const analytics = [];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    analytics.push({
      user_id: userIds[1],
      metric_type: 'traffic',
      metric_key: 'visitors',
      value: Math.floor(Math.random() * 1000) + 500,
      date: dateStr
    });

    analytics.push({
      user_id: userIds[1],
      metric_type: 'engagement',
      metric_key: 'pageviews',
      value: Math.floor(Math.random() * 5000) + 2000,
      date: dateStr
    });
  }

  const insertAnalytic = db.prepare(`
    INSERT INTO analytics (user_id, metric_type, metric_key, value, date)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const metric of analytics) {
    insertAnalytic.run(
      metric.user_id,
      metric.metric_type,
      metric.metric_key,
      metric.value,
      metric.date
    );
  }

  console.log('Created demo analytics data');

  // Create demo project
  const insertProject = db.prepare(`
    INSERT INTO projects (user_id, name, description, status, budget, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertProject.run(
    userIds[1],
    'Q1 2024 Marketing Campaign',
    'Comprehensive digital marketing campaign for Q1',
    'active',
    15000,
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  console.log('Created demo project');

  console.log('\n=== Demo Data Created Successfully ===');
  console.log('Demo Admin:');
  console.log('  Email: admin@mondosolutions.com');
  console.log('  Password: password123');
  console.log('\nDemo Client:');
  console.log('  Email: client@example.com');
  console.log('  Password: password123');
  console.log('=====================================\n');
}

createDemoData().catch(console.error);
