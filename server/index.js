const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const calendarRoutes = require('./routes/calendar');
const transactionRoutes = require('./routes/transactions');
const emailRoutes = require('./routes/email');
const settingsRoutes = require('./routes/settings');
const projectsRoutes = require('./routes/projects');
const tasksRoutes = require('./routes/tasks');
const clientsRoutes = require('./routes/clients');
const invoicesRoutes = require('./routes/invoices');
const timeEntriesRoutes = require('./routes/time-entries');
const expensesRoutes = require('./routes/expenses');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'auth-login.html'));
});

// Handle SPA routing - serve HTML files
app.get('*.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', req.path));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'pages-404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mondo Portal server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
