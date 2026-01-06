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

  // Create demo clients
  const clients = [
    {
      user_id: userIds[0],
      name: 'Example Corporation',
      email: 'contact@examplecorp.com',
      phone: '555-0100',
      company: 'Example Corp',
      address: '123 Business St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'USA',
      notes: 'Long-term client, prefers monthly billing',
      status: 'active'
    },
    {
      user_id: userIds[0],
      name: 'TechStart Inc',
      email: 'info@techstart.com',
      phone: '555-0200',
      company: 'TechStart Inc',
      address: '456 Innovation Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'USA',
      notes: 'Fast-growing startup, needs weekly updates',
      status: 'active'
    },
    {
      user_id: userIds[0],
      name: 'Global Ventures',
      email: 'hello@globalventures.com',
      phone: '555-0300',
      company: 'Global Ventures LLC',
      address: '789 Enterprise Blvd',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      notes: 'Enterprise client, quarterly projects',
      status: 'active'
    }
  ];

  const insertClient = db.prepare(`
    INSERT INTO clients (user_id, name, email, phone, company, address, city, state, zip, country, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clientIds = [];
  for (const client of clients) {
    const result = insertClient.run(
      client.user_id,
      client.name,
      client.email,
      client.phone,
      client.company,
      client.address,
      client.city,
      client.state,
      client.zip,
      client.country,
      client.notes,
      client.status
    );
    clientIds.push(result.lastInsertRowid);
  }

  console.log('Created demo clients');

  // Create demo projects
  const projects = [
    {
      user_id: userIds[0],
      client_id: clientIds[0],
      name: 'Q1 2024 Marketing Campaign',
      description: 'Comprehensive digital marketing campaign for Q1 including SEO, social media, and content marketing',
      status: 'active',
      priority: 'high',
      budget: 25000,
      actual_cost: 12500,
      progress: 50,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      user_id: userIds[0],
      client_id: clientIds[1],
      name: 'Website Redesign',
      description: 'Complete website redesign with modern UI/UX and mobile optimization',
      status: 'active',
      priority: 'high',
      budget: 18000,
      actual_cost: 15000,
      progress: 75,
      start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      user_id: userIds[0],
      client_id: clientIds[2],
      name: 'Brand Strategy Development',
      description: 'Develop comprehensive brand strategy and identity guidelines',
      status: 'planning',
      priority: 'medium',
      budget: 35000,
      actual_cost: 5000,
      progress: 15,
      start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (user_id, client_id, name, description, status, priority, budget, actual_cost, progress, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projectIds = [];
  for (const project of projects) {
    const result = insertProject.run(
      project.user_id,
      project.client_id,
      project.name,
      project.description,
      project.status,
      project.priority,
      project.budget,
      project.actual_cost,
      project.progress,
      project.start_date,
      project.end_date
    );
    projectIds.push(result.lastInsertRowid);
  }

  console.log('Created demo projects');

  // Create demo tasks
  const tasks = [
    // Project 1 tasks
    { project_id: projectIds[0], title: 'SEO Audit', description: 'Conduct comprehensive SEO audit', status: 'completed', priority: 'high', assigned_to: userIds[0], estimated_hours: 8, actual_hours: 7, order_index: 1, due_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[0], title: 'Keyword Research', description: 'Research and compile target keywords', status: 'completed', priority: 'high', assigned_to: userIds[0], estimated_hours: 6, actual_hours: 6, order_index: 2, due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[0], title: 'Content Calendar', description: 'Create Q1 content calendar', status: 'in_progress', priority: 'medium', assigned_to: userIds[0], estimated_hours: 4, actual_hours: 2, order_index: 3, due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[0], title: 'Social Media Strategy', description: 'Develop social media posting strategy', status: 'todo', priority: 'medium', assigned_to: userIds[0], estimated_hours: 5, actual_hours: 0, order_index: 4, due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },

    // Project 2 tasks
    { project_id: projectIds[1], title: 'Design Mockups', description: 'Create homepage and key page mockups', status: 'completed', priority: 'high', assigned_to: userIds[0], estimated_hours: 16, actual_hours: 18, order_index: 1, due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[1], title: 'Frontend Development', description: 'Implement responsive frontend', status: 'in_progress', priority: 'high', assigned_to: userIds[0], estimated_hours: 40, actual_hours: 35, order_index: 2, due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[1], title: 'Content Migration', description: 'Migrate existing content to new site', status: 'todo', priority: 'medium', assigned_to: userIds[0], estimated_hours: 12, actual_hours: 0, order_index: 3, due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },

    // Project 3 tasks
    { project_id: projectIds[2], title: 'Brand Workshop', description: 'Conduct stakeholder brand workshop', status: 'completed', priority: 'high', assigned_to: userIds[0], estimated_hours: 4, actual_hours: 4, order_index: 1, due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectIds[2], title: 'Competitive Analysis', description: 'Analyze competitor positioning', status: 'in_progress', priority: 'medium', assigned_to: userIds[0], estimated_hours: 8, actual_hours: 3, order_index: 2, due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, estimated_hours, actual_hours, order_index, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const taskIds = [];
  for (const task of tasks) {
    const result = insertTask.run(
      task.project_id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assigned_to,
      task.estimated_hours,
      task.actual_hours,
      task.order_index,
      task.due_date
    );
    taskIds.push(result.lastInsertRowid);
  }

  console.log('Created demo tasks');

  // Create demo task comments
  const taskComments = [
    { task_id: taskIds[0], user_id: userIds[0], comment: 'Completed initial audit, found several optimization opportunities' },
    { task_id: taskIds[1], user_id: userIds[0], comment: 'Identified 50+ high-value keywords for targeting' },
    { task_id: taskIds[2], user_id: userIds[0], comment: 'Working on February content schedule' },
    { task_id: taskIds[5], user_id: userIds[0], comment: 'Frontend is looking great on mobile devices' }
  ];

  const insertTaskComment = db.prepare(`
    INSERT INTO task_comments (task_id, user_id, comment)
    VALUES (?, ?, ?)
  `);

  for (const comment of taskComments) {
    insertTaskComment.run(comment.task_id, comment.user_id, comment.comment);
  }

  console.log('Created demo task comments');

  // Create demo milestones
  const milestones = [
    { project_id: projectIds[0], name: 'Campaign Launch', description: 'Launch initial campaign phase', due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' },
    { project_id: projectIds[1], name: 'Beta Launch', description: 'Launch beta version for testing', due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' },
    { project_id: projectIds[1], name: 'Public Launch', description: 'Full public website launch', due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' },
    { project_id: projectIds[2], name: 'Strategy Presentation', description: 'Present final brand strategy to stakeholders', due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' }
  ];

  const insertMilestone = db.prepare(`
    INSERT INTO milestones (project_id, name, description, due_date, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const milestone of milestones) {
    insertMilestone.run(
      milestone.project_id,
      milestone.name,
      milestone.description,
      milestone.due_date,
      milestone.status
    );
  }

  console.log('Created demo milestones');

  // Create demo invoices
  const invoices = [
    {
      user_id: userIds[0],
      client_id: clientIds[0],
      project_id: projectIds[0],
      invoice_number: 'INV-2024-0001',
      status: 'paid',
      issue_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 10000,
      tax_rate: 0.08,
      tax_amount: 800,
      discount_amount: 0,
      total: 10800,
      amount_paid: 10800,
      notes: 'First payment for Q1 Marketing Campaign',
      terms: 'Net 30'
    },
    {
      user_id: userIds[0],
      client_id: clientIds[1],
      project_id: projectIds[1],
      invoice_number: 'INV-2024-0002',
      status: 'partial',
      issue_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 15000,
      tax_rate: 0.08,
      tax_amount: 1200,
      discount_amount: 500,
      total: 15700,
      amount_paid: 7850,
      notes: 'Website redesign - 50% deposit received',
      terms: 'Net 30, 50% upfront'
    },
    {
      user_id: userIds[0],
      client_id: clientIds[2],
      project_id: projectIds[2],
      invoice_number: 'INV-2024-0003',
      status: 'sent',
      issue_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 5000,
      tax_rate: 0.08,
      tax_amount: 400,
      discount_amount: 0,
      total: 5400,
      amount_paid: 0,
      notes: 'Initial brand strategy consultation',
      terms: 'Net 30'
    }
  ];

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (user_id, client_id, project_id, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount_amount, total, amount_paid, notes, terms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const invoiceIds = [];
  for (const invoice of invoices) {
    const result = insertInvoice.run(
      invoice.user_id,
      invoice.client_id,
      invoice.project_id,
      invoice.invoice_number,
      invoice.status,
      invoice.issue_date,
      invoice.due_date,
      invoice.subtotal,
      invoice.tax_rate,
      invoice.tax_amount,
      invoice.discount_amount,
      invoice.total,
      invoice.amount_paid,
      invoice.notes,
      invoice.terms
    );
    invoiceIds.push(result.lastInsertRowid);
  }

  console.log('Created demo invoices');

  // Create demo invoice items
  const invoiceItems = [
    // Invoice 1 items
    { invoice_id: invoiceIds[0], description: 'SEO Audit & Strategy', quantity: 1, rate: 3000, amount: 3000 },
    { invoice_id: invoiceIds[0], description: 'Content Creation (10 articles)', quantity: 10, rate: 500, amount: 5000 },
    { invoice_id: invoiceIds[0], description: 'Social Media Management', quantity: 1, rate: 2000, amount: 2000 },

    // Invoice 2 items
    { invoice_id: invoiceIds[1], description: 'Website Design', quantity: 1, rate: 8000, amount: 8000 },
    { invoice_id: invoiceIds[1], description: 'Frontend Development', quantity: 40, rate: 150, amount: 6000 },
    { invoice_id: invoiceIds[1], description: 'Mobile Optimization', quantity: 1, rate: 1000, amount: 1000 },

    // Invoice 3 items
    { invoice_id: invoiceIds[2], description: 'Brand Workshop', quantity: 1, rate: 2500, amount: 2500 },
    { invoice_id: invoiceIds[2], description: 'Competitive Analysis', quantity: 1, rate: 2500, amount: 2500 }
  ];

  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const item of invoiceItems) {
    insertInvoiceItem.run(
      item.invoice_id,
      item.description,
      item.quantity,
      item.rate,
      item.amount
    );
  }

  console.log('Created demo invoice items');

  // Create demo payments
  const payments = [
    { invoice_id: invoiceIds[0], amount: 10800, payment_method: 'bank_transfer', transaction_id: 'TRF-2024-001', payment_date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Wire transfer received' },
    { invoice_id: invoiceIds[1], amount: 7850, payment_method: 'credit_card', transaction_id: 'CC-2024-002', payment_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: '50% deposit' }
  ];

  const insertPayment = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, transaction_id, payment_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const payment of payments) {
    insertPayment.run(
      payment.invoice_id,
      payment.amount,
      payment.payment_method,
      payment.transaction_id,
      payment.payment_date,
      payment.notes
    );
  }

  console.log('Created demo payments');

  // Create demo time entries
  const timeEntries = [
    // Project 1 time entries
    { user_id: userIds[0], project_id: projectIds[0], task_id: taskIds[0], description: 'SEO audit work', hours: 7, billable: 1, hourly_rate: 150, date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { user_id: userIds[0], project_id: projectIds[0], task_id: taskIds[1], description: 'Keyword research', hours: 6, billable: 1, hourly_rate: 150, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { user_id: userIds[0], project_id: projectIds[0], task_id: taskIds[2], description: 'Content calendar planning', hours: 2, billable: 1, hourly_rate: 150, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },

    // Project 2 time entries
    { user_id: userIds[0], project_id: projectIds[1], task_id: taskIds[4], description: 'Design work', hours: 18, billable: 1, hourly_rate: 175, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { user_id: userIds[0], project_id: projectIds[1], task_id: taskIds[5], description: 'Frontend development', hours: 35, billable: 1, hourly_rate: 175, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },

    // Project 3 time entries
    { user_id: userIds[0], project_id: projectIds[2], task_id: taskIds[7], description: 'Brand workshop facilitation', hours: 4, billable: 1, hourly_rate: 200, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { user_id: userIds[0], project_id: projectIds[2], task_id: taskIds[8], description: 'Competitive research', hours: 3, billable: 1, hourly_rate: 200, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
  ];

  const insertTimeEntry = db.prepare(`
    INSERT INTO time_entries (user_id, project_id, task_id, description, hours, billable, hourly_rate, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entry of timeEntries) {
    insertTimeEntry.run(
      entry.user_id,
      entry.project_id,
      entry.task_id,
      entry.description,
      entry.hours,
      entry.billable,
      entry.hourly_rate,
      entry.date
    );
  }

  console.log('Created demo time entries');

  // Create demo expenses
  const expenses = [
    { user_id: userIds[0], project_id: projectIds[0], client_id: clientIds[0], category: 'Advertising', amount: 1500, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'Google Ads campaign', billable: 1, invoiced: 0 },
    { user_id: userIds[0], project_id: projectIds[0], client_id: clientIds[0], category: 'Software', amount: 299, date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'SEO tools subscription', billable: 1, invoiced: 0 },
    { user_id: userIds[0], project_id: projectIds[1], client_id: clientIds[1], category: 'Software', amount: 49, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'Stock photos', billable: 1, invoiced: 0 },
    { user_id: userIds[0], project_id: null, client_id: null, category: 'Office', amount: 150, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'Office supplies', billable: 0, invoiced: 0 },
    { user_id: userIds[0], project_id: projectIds[2], client_id: clientIds[2], category: 'Travel', amount: 350, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'Client meeting travel', billable: 1, invoiced: 0 }
  ];

  const insertExpense = db.prepare(`
    INSERT INTO expenses (user_id, project_id, client_id, category, amount, date, description, billable, invoiced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const expense of expenses) {
    insertExpense.run(
      expense.user_id,
      expense.project_id,
      expense.client_id,
      expense.category,
      expense.amount,
      expense.date,
      expense.description,
      expense.billable,
      expense.invoiced
    );
  }

  console.log('Created demo expenses');

  // Create demo notifications
  const notifications = [
    { user_id: userIds[0], type: 'task', title: 'Task Completed', message: 'SEO Audit task has been completed', is_read: 1, created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userIds[0], type: 'payment', title: 'Payment Received', message: 'Payment of $10,800 received for Invoice INV-2024-0001', is_read: 1, created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userIds[0], type: 'invoice', title: 'Invoice Sent', message: 'Invoice INV-2024-0003 has been sent to Global Ventures', is_read: 0, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userIds[0], type: 'project', title: 'Project Milestone', message: 'Website redesign is 75% complete', is_read: 0, created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userIds[0], type: 'task', title: 'Task Due Soon', message: 'Content Calendar task is due in 5 days', is_read: 0, created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const notification of notifications) {
    insertNotification.run(
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.is_read,
      notification.created_at
    );
  }

  console.log('Created demo notifications');

  // Create demo project members
  const projectMembers = [
    { project_id: projectIds[0], user_id: userIds[0], role: 'owner' },
    { project_id: projectIds[1], user_id: userIds[0], role: 'owner' },
    { project_id: projectIds[2], user_id: userIds[0], role: 'owner' }
  ];

  const insertProjectMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `);

  for (const member of projectMembers) {
    insertProjectMember.run(member.project_id, member.user_id, member.role);
  }

  console.log('Created demo project members');

  console.log('\n=== Demo Data Created Successfully ===');
  console.log('Demo Admin:');
  console.log('  Email: admin@mondosolutions.com');
  console.log('  Password: password123');
  console.log('\nDemo Client:');
  console.log('  Email: client@example.com');
  console.log('  Password: password123');
  console.log('\nDemo Data Includes:');
  console.log('  - 3 Clients');
  console.log('  - 3 Projects with varying progress');
  console.log('  - 9 Tasks across projects');
  console.log('  - 4 Project milestones');
  console.log('  - 3 Invoices (paid, partial, sent)');
  console.log('  - 8 Invoice items');
  console.log('  - 2 Payments');
  console.log('  - 7 Time entries');
  console.log('  - 5 Expenses');
  console.log('  - 5 Notifications');
  console.log('  - Task comments and project members');
  console.log('=====================================\n');
}

createDemoData().catch(console.error);
