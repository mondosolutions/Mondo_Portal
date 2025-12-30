// Registration page handler
(function() {
  'use strict';

  // Check if already logged in
  if (MondoAPI.isAuthenticated()) {
    window.location.href = '/index.html';
    return;
  }

  // Get form elements
  const registerForm = document.querySelector('form');
  const nameInput = document.getElementById('username');
  const emailInput = document.getElementById('useremail');
  const companyInput = document.getElementById('company');
  const passwordInput = document.getElementById('userpassword');
  const submitBtn = registerForm.querySelector('button[type="submit"]');

  // Handle form submission
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const company = companyInput ? companyInput.value.trim() : '';
    const password = passwordInput.value;

    if (!name || !email || !password) {
      showError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm mr-2"></span>Creating account...';

    try {
      const response = await MondoAPI.auth.register(email, password, name, company);

      if (response.success) {
        // Show success message
        showSuccess('Account created successfully! Redirecting to login...');

        // Clear form
        registerForm.reset();

        // Redirect to login
        setTimeout(() => {
          window.location.href = '/auth-login.html';
        }, 2000);
      } else {
        showError(response.message || 'Registration failed');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Register';
      }
    } catch (error) {
      showError(error.message || 'Registration failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Register';
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
    registerForm.parentNode.insertBefore(alert, registerForm);
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
    registerForm.parentNode.insertBefore(alert, registerForm);
  }

})();
