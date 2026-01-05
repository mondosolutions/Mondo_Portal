// Login page handler
(function() {
  'use strict';

  // Check if already logged in
  if (MondoAPI.isAuthenticated()) {
    window.location.href = '/index.html';
    return;
  }

  // Get form elements
  const loginForm = document.querySelector('form');
  const emailInput = document.getElementById('username');
  const passwordInput = document.getElementById('userpassword');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Handle form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm mr-2"></span>Logging in...';

    try {
      const response = await MondoAPI.auth.login(email, password);

      if (response.success) {
        // Show success message
        showSuccess('Login successful! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
      } else {
        showError(response.message || 'Login failed');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Log In';
      }
    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Log In';
    }
  });

  function showError(message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    // Insert before form
    loginForm.parentNode.insertBefore(alert, loginForm);
  }

  function showSuccess(message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    // Insert before form
    loginForm.parentNode.insertBefore(alert, loginForm);
  }

})();
