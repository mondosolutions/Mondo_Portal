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
