// Mondo Portal API Client
(function(window) {
  'use strict';

  const API_BASE_URL = window.location.origin + '/api';

  // Storage helpers
  const storage = {
    setToken: function(token) {
      localStorage.setItem('mondo_token', token);
    },
    getToken: function() {
      return localStorage.getItem('mondo_token');
    },
    removeToken: function() {
      localStorage.removeItem('mondo_token');
    },
    setUser: function(user) {
      localStorage.setItem('mondo_user', JSON.stringify(user));
    },
    getUser: function() {
      const user = localStorage.getItem('mondo_user');
      return user ? JSON.parse(user) : null;
    },
    removeUser: function() {
      localStorage.removeItem('mondo_user');
    },
    clear: function() {
      this.removeToken();
      this.removeUser();
    }
  };

  // API request helper
  async function apiRequest(endpoint, options = {}) {
    const token = storage.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(API_BASE_URL + endpoint, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - clear storage and redirect to login
          storage.clear();
          if (window.location.pathname !== '/auth-login.html') {
            window.location.href = '/auth-login.html';
          }
        }
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // API methods
  const api = {
    // Authentication
    auth: {
      login: async function(email, password) {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (data.success) {
          storage.setToken(data.token);
          storage.setUser(data.user);
        }
        return data;
      },
      register: async function(email, password, name, company) {
        return await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name, company })
        });
      },
      logout: async function() {
        try {
          await apiRequest('/auth/logout', { method: 'POST' });
        } finally {
          storage.clear();
          window.location.href = '/auth-login.html';
        }
      },
      recoverPassword: async function(email) {
        return await apiRequest('/auth/recover-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
      },
      getCurrentUser: async function() {
        const data = await apiRequest('/auth/me');
        if (data.success && data.user) {
          storage.setUser(data.user);
        }
        return data;
      }
    },

    // Users
    users: {
      getProfile: async function() {
        return await apiRequest('/users/profile');
      },
      updateProfile: async function(updates) {
        return await apiRequest('/users/profile', {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      getAll: async function() {
        return await apiRequest('/users');
      }
    },

    // Dashboard
    dashboard: {
      getOverview: async function() {
        return await apiRequest('/dashboard/overview');
      },
      getRecentTransactions: async function(limit = 10) {
        return await apiRequest(`/dashboard/recent-transactions?limit=${limit}`);
      },
      getSalesChart: async function(period = 'month') {
        return await apiRequest(`/dashboard/sales-chart?period=${period}`);
      },
      getAnalytics: async function(startDate, endDate) {
        let url = '/dashboard/analytics';
        if (startDate && endDate) {
          url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        return await apiRequest(url);
      }
    },

    // Calendar
    calendar: {
      getEvents: async function(start, end) {
        let url = '/calendar';
        if (start && end) {
          url += `?start=${start}&end=${end}`;
        }
        return await apiRequest(url);
      },
      getEvent: async function(id) {
        return await apiRequest(`/calendar/${id}`);
      },
      createEvent: async function(event) {
        return await apiRequest('/calendar', {
          method: 'POST',
          body: JSON.stringify(event)
        });
      },
      updateEvent: async function(id, updates) {
        return await apiRequest(`/calendar/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      deleteEvent: async function(id) {
        return await apiRequest(`/calendar/${id}`, {
          method: 'DELETE'
        });
      }
    },

    // Transactions
    transactions: {
      getAll: async function(page = 1, limit = 50, filters = {}) {
        let url = `/transactions?page=${page}&limit=${limit}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.type) url += `&type=${filters.type}`;
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/transactions/${id}`);
      },
      create: async function(transaction) {
        return await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(transaction)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/transactions/${id}`, {
          method: 'DELETE'
        });
      }
    },

    // Email
    email: {
      getInbox: async function(page = 1, limit = 20) {
        return await apiRequest(`/email/inbox?page=${page}&limit=${limit}`);
      },
      getSent: async function(page = 1, limit = 20) {
        return await apiRequest(`/email/sent?page=${page}&limit=${limit}`);
      },
      getDrafts: async function() {
        return await apiRequest('/email/drafts');
      },
      getStarred: async function() {
        return await apiRequest('/email/starred');
      },
      get: async function(id) {
        return await apiRequest(`/email/${id}`);
      },
      send: async function(email) {
        return await apiRequest('/email', {
          method: 'POST',
          body: JSON.stringify(email)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/email/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/email/${id}`, {
          method: 'DELETE'
        });
      },
      getUnreadCount: async function() {
        return await apiRequest('/email/count/unread');
      }
    },

    // Settings
    settings: {
      getAll: async function() {
        return await apiRequest('/settings');
      },
      get: async function(key) {
        return await apiRequest(`/settings/${key}`);
      },
      update: async function(key, value) {
        return await apiRequest(`/settings/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ value })
        });
      },
      batchUpdate: async function(settings) {
        return await apiRequest('/settings/batch', {
          method: 'POST',
          body: JSON.stringify({ settings })
        });
      },
      delete: async function(key) {
        return await apiRequest(`/settings/${key}`, {
          method: 'DELETE'
        });
      }
    },

    // Projects
    projects: {
      getAll: async function(filters = {}) {
        let url = '/projects';
        const params = new URLSearchParams();
        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/projects/${id}`);
      },
      create: async function(project) {
        return await apiRequest('/projects', {
          method: 'POST',
          body: JSON.stringify(project)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/projects/${id}`, {
          method: 'DELETE'
        });
      },
      getStats: async function(id) {
        return await apiRequest(`/projects/${id}/stats`);
      },
      getMembers: async function(id) {
        return await apiRequest(`/projects/${id}/members`);
      },
      addMember: async function(id, userId, role) {
        return await apiRequest(`/projects/${id}/members`, {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, role })
        });
      },
      removeMember: async function(id, userId) {
        return await apiRequest(`/projects/${id}/members/${userId}`, {
          method: 'DELETE'
        });
      }
    },

    // Tasks
    tasks: {
      getAll: async function(filters = {}) {
        let url = '/tasks';
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/tasks/${id}`);
      },
      create: async function(task) {
        return await apiRequest('/tasks', {
          method: 'POST',
          body: JSON.stringify(task)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/tasks/${id}`, {
          method: 'DELETE'
        });
      },
      updateStatus: async function(id, status) {
        return await apiRequest(`/tasks/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
      },
      reorder: async function(taskIds) {
        return await apiRequest('/tasks/reorder', {
          method: 'POST',
          body: JSON.stringify({ task_ids: taskIds })
        });
      },
      addComment: async function(id, comment) {
        return await apiRequest(`/tasks/${id}/comments`, {
          method: 'POST',
          body: JSON.stringify({ comment })
        });
      },
      getComments: async function(id) {
        return await apiRequest(`/tasks/${id}/comments`);
      }
    },

    // Clients
    clients: {
      getAll: async function(status = null) {
        let url = '/clients';
        if (status) url += `?status=${status}`;
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/clients/${id}`);
      },
      create: async function(client) {
        return await apiRequest('/clients', {
          method: 'POST',
          body: JSON.stringify(client)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/clients/${id}`, {
          method: 'DELETE'
        });
      },
      getProjects: async function(id) {
        return await apiRequest(`/clients/${id}/projects`);
      },
      getInvoices: async function(id) {
        return await apiRequest(`/clients/${id}/invoices`);
      }
    },

    // Invoices
    invoices: {
      getAll: async function(filters = {}) {
        let url = '/invoices';
        const params = new URLSearchParams();
        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/invoices/${id}`);
      },
      create: async function(invoice) {
        return await apiRequest('/invoices', {
          method: 'POST',
          body: JSON.stringify(invoice)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/invoices/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/invoices/${id}`, {
          method: 'DELETE'
        });
      },
      updateStatus: async function(id, status) {
        return await apiRequest(`/invoices/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
      },
      addPayment: async function(id, payment) {
        return await apiRequest(`/invoices/${id}/payments`, {
          method: 'POST',
          body: JSON.stringify(payment)
        });
      },
      getPayments: async function(id) {
        return await apiRequest(`/invoices/${id}/payments`);
      }
    },

    // Time Entries
    timeEntries: {
      getAll: async function(filters = {}) {
        let url = '/time-entries';
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.task_id) params.append('task_id', filters.task_id);
        if (filters.billable !== undefined) params.append('billable', filters.billable);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/time-entries/${id}`);
      },
      create: async function(entry) {
        return await apiRequest('/time-entries', {
          method: 'POST',
          body: JSON.stringify(entry)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/time-entries/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/time-entries/${id}`, {
          method: 'DELETE'
        });
      }
    },

    // Expenses
    expenses: {
      getAll: async function(filters = {}) {
        let url = '/expenses';
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.category) params.append('category', filters.category);
        if (filters.billable !== undefined) params.append('billable', filters.billable);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      get: async function(id) {
        return await apiRequest(`/expenses/${id}`);
      },
      create: async function(expense) {
        return await apiRequest('/expenses', {
          method: 'POST',
          body: JSON.stringify(expense)
        });
      },
      update: async function(id, updates) {
        return await apiRequest(`/expenses/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      },
      delete: async function(id) {
        return await apiRequest(`/expenses/${id}`, {
          method: 'DELETE'
        });
      },
      getCategories: async function() {
        return await apiRequest('/expenses/meta/categories');
      }
    },

    // Notifications
    notifications: {
      getAll: async function(filters = {}) {
        let url = '/notifications';
        const params = new URLSearchParams();
        if (filters.is_read !== undefined) params.append('is_read', filters.is_read);
        if (filters.limit) params.append('limit', filters.limit);
        if (params.toString()) url += '?' + params.toString();
        return await apiRequest(url);
      },
      markAsRead: async function(id) {
        return await apiRequest(`/notifications/${id}/read`, {
          method: 'PATCH'
        });
      },
      markAllAsRead: async function() {
        return await apiRequest('/notifications/mark-all-read', {
          method: 'POST'
        });
      },
      delete: async function(id) {
        return await apiRequest(`/notifications/${id}`, {
          method: 'DELETE'
        });
      }
    }
  };

  // Helper to check if user is authenticated
  function isAuthenticated() {
    return !!storage.getToken();
  }

  // Helper to require authentication on a page
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/auth-login.html';
      return false;
    }
    return true;
  }

  // Helper to update user display in navbar
  function updateUserDisplay() {
    const user = storage.getUser();
    if (user) {
      // Update user name in navbar
      const userNameElements = document.querySelectorAll('.user-name');
      userNameElements.forEach(el => {
        el.textContent = user.name;
      });

      // Update user avatar if exists
      if (user.avatar) {
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
          el.src = user.avatar;
        });
      }
    }
  }

  // Export API to window
  window.MondoAPI = {
    ...api,
    storage,
    isAuthenticated,
    requireAuth,
    updateUserDisplay
  };

})(window);
