// Password recovery page handler
(function() {
  'use strict';

  // Check if already logged in
  if (MondoAPI.isAuthenticated()) {
    window.location.href = '/index.html';
    return;
  }

  // Get form elements
  const recoveryForm = document.querySelector('form');
  const emailInput = document.getElementById('useremail');
  const submitBtn = recoveryForm.querySelector('button[type="submit"]');

  // Handle form submission
  recoveryForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
      showError('Please enter your email address');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm mr-2"></span>Sending...';

    try {
      const response = await MondoAPI.auth.recoverPassword(email);

      if (response.success) {
        // Show success message
        showSuccess(response.message || 'Password reset instructions have been sent to your email');

        // Clear form
        recoveryForm.reset();

        // Redirect to login after delay
        setTimeout(() => {
          window.location.href = '/auth-login.html';
        }, 3000);
      } else {
        showError(response.message || 'Password recovery failed');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Reset Password';
      }
    } catch (error) {
      showError(error.message || 'Password recovery failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Reset Password';
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
    recoveryForm.parentNode.insertBefore(alert, recoveryForm);
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
    recoveryForm.parentNode.insertBefore(alert, recoveryForm);
  }

})();
