// Dashboard page handler
(function() {
  'use strict';

  // Require authentication
  if (!MondoAPI.requireAuth()) {
    return;
  }

  // Update user display
  MondoAPI.updateUserDisplay();

  // Load dashboard data
  loadDashboardData();

  // Load dashboard overview stats
  async function loadDashboardData() {
    try {
      // Load overview stats
      const overviewResponse = await MondoAPI.dashboard.getOverview();
      if (overviewResponse.success) {
        updateOverviewStats(overviewResponse.stats);
      }

      // Load recent transactions
      const transactionsResponse = await MondoAPI.dashboard.getRecentTransactions(10);
      if (transactionsResponse.success) {
        updateRecentTransactions(transactionsResponse.transactions);
      }

      // Load sales chart
      const salesResponse = await MondoAPI.dashboard.getSalesChart('month');
      if (salesResponse.success) {
        updateSalesChart(salesResponse.data);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
    }
  }

  // Update overview stats
  function updateOverviewStats(stats) {
    // Update revenue
    const revenueElement = document.querySelector('[data-stat="revenue"]');
    if (revenueElement) {
      revenueElement.textContent = '$' + formatNumber(stats.revenue);
    }

    // Update transactions count
    const transactionsElement = document.querySelector('[data-stat="transactions"]');
    if (transactionsElement) {
      transactionsElement.textContent = formatNumber(stats.transactions);
    }

    // Update projects count
    const projectsElement = document.querySelector('[data-stat="projects"]');
    if (projectsElement) {
      projectsElement.textContent = formatNumber(stats.projects);
    }

    // Update tasks count
    const tasksElement = document.querySelector('[data-stat="tasks"]');
    if (tasksElement) {
      tasksElement.textContent = formatNumber(stats.tasks);
    }
  }

  // Update recent transactions table
  function updateRecentTransactions(transactions) {
    const tableBody = document.querySelector('#transactions-table tbody');
    if (!tableBody) return;

    if (transactions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions found</td></tr>';
      return;
    }

    tableBody.innerHTML = transactions.map(txn => `
      <tr>
        <td>${txn.transaction_id}</td>
        <td>${txn.description || '-'}</td>
        <td>
          <span class="badge badge-${txn.type === 'income' ? 'success' : 'warning'}">
            ${txn.type.toUpperCase()}
          </span>
        </td>
        <td>$${formatNumber(txn.amount)}</td>
        <td>
          <span class="badge badge-${getStatusBadgeClass(txn.status)}">
            ${txn.status.toUpperCase()}
          </span>
        </td>
        <td>${formatDate(txn.date)}</td>
      </tr>
    `).join('');
  }

  // Update sales chart
  function updateSalesChart(data) {
    // This will integrate with the existing chart library
    // For now, we'll just log the data
    console.log('Sales chart data loaded:', data);

    // If ApexCharts is being used, update it here
    if (window.salesChart && typeof window.salesChart.updateSeries === 'function') {
      const categories = data.map(d => d.period);
      const incomeSeries = data.map(d => d.income);
      const expenseSeries = data.map(d => d.expense);

      window.salesChart.updateOptions({
        xaxis: { categories }
      });

      window.salesChart.updateSeries([
        { name: 'Income', data: incomeSeries },
        { name: 'Expenses', data: expenseSeries }
      ]);
    }
  }

  // Helper functions
  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getStatusBadgeClass(status) {
    const statusMap = {
      'completed': 'success',
      'pending': 'warning',
      'failed': 'danger',
      'cancelled': 'secondary'
    };
    return statusMap[status] || 'secondary';
  }

  // Setup logout handler
  const logoutBtn = document.querySelector('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      await MondoAPI.auth.logout();
    });
  }

})();
