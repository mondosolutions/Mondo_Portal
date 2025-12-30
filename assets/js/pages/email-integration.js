// Email system integration with backend API
(function() {
  'use strict';

  // Require authentication
  if (!MondoAPI.requireAuth()) {
    return;
  }

  // Update user display
  MondoAPI.updateUserDisplay();

  // Initialize email functionality based on current page
  const currentPage = window.location.pathname;

  if (currentPage.includes('email-inbox')) {
    loadInbox();
  } else if (currentPage.includes('email-compose')) {
    initializeCompose();
  } else if (currentPage.includes('email-read')) {
    loadEmail();
  }

  // Update unread count
  updateUnreadCount();

  // Load inbox
  async function loadInbox() {
    try {
      const response = await MondoAPI.email.getInbox(1, 50);
      if (response.success) {
        displayEmailList(response.emails);
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
    }
  }

  // Display email list
  function displayEmailList(emails) {
    const emailList = document.querySelector('#email-list');
    if (!emailList) return;

    if (emails.length === 0) {
      emailList.innerHTML = '<div class="text-center p-4">No emails found</div>';
      return;
    }

    emailList.innerHTML = emails.map(email => `
      <div class="email-item ${email.is_read ? '' : 'unread'}" data-email-id="${email.id}">
        <div class="email-sender">
          <img src="${email.sender_avatar || 'assets/images/users/avatar-1.jpg'}"
               class="avatar-sm rounded-circle mr-2" alt="">
          <span class="font-weight-bold">${escapeHtml(email.sender_name)}</span>
        </div>
        <div class="email-subject">
          ${escapeHtml(email.subject)}
        </div>
        <div class="email-date">
          ${formatDate(email.sent_at)}
        </div>
        <div class="email-star">
          <i class="mdi mdi-star${email.is_starred ? '' : '-outline'}"
             data-action="toggle-star"
             data-email-id="${email.id}"></i>
        </div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.email-item').forEach(item => {
      item.addEventListener('click', function(e) {
        if (e.target.dataset.action === 'toggle-star') {
          toggleStar(e.target.dataset.emailId);
        } else {
          const emailId = this.dataset.emailId;
          window.location.href = `email-read.html?id=${emailId}`;
        }
      });
    });
  }

  // Load single email
  async function loadEmail() {
    const urlParams = new URLSearchParams(window.location.search);
    const emailId = urlParams.get('id');

    if (!emailId) {
      console.error('No email ID provided');
      return;
    }

    try {
      const response = await MondoAPI.email.get(emailId);
      if (response.success) {
        displayEmail(response.email);
      }
    } catch (error) {
      console.error('Error loading email:', error);
    }
  }

  // Display email content
  function displayEmail(email) {
    // Update sender info
    const senderName = document.querySelector('#sender-name');
    const senderEmail = document.querySelector('#sender-email');
    const emailDate = document.querySelector('#email-date');
    const emailSubject = document.querySelector('#email-subject');
    const emailBody = document.querySelector('#email-body');

    if (senderName) senderName.textContent = email.sender_name;
    if (senderEmail) senderEmail.textContent = `<${email.sender_email}>`;
    if (emailDate) emailDate.textContent = formatDate(email.sent_at);
    if (emailSubject) emailSubject.textContent = email.subject;
    if (emailBody) emailBody.innerHTML = escapeHtml(email.body).replace(/\n/g, '<br>');

    // Update star button
    const starBtn = document.querySelector('[data-action="toggle-star"]');
    if (starBtn) {
      starBtn.classList.toggle('starred', email.is_starred);
      starBtn.onclick = () => toggleStar(email.id);
    }

    // Setup delete button
    const deleteBtn = document.querySelector('[data-action="delete-email"]');
    if (deleteBtn) {
      deleteBtn.onclick = () => deleteEmail(email.id);
    }

    // Setup reply button
    const replyBtn = document.querySelector('[data-action="reply-email"]');
    if (replyBtn) {
      replyBtn.onclick = () => {
        window.location.href = `email-compose.html?reply=${email.id}&to=${email.from_user_id}`;
      };
    }
  }

  // Initialize compose functionality
  function initializeCompose() {
    const composeForm = document.querySelector('#compose-form');
    if (!composeForm) return;

    const recipientSelect = document.querySelector('#recipient');
    const subjectInput = document.querySelector('#subject');
    const bodyInput = document.querySelector('#email-body');
    const sendBtn = document.querySelector('[data-action="send-email"]');
    const saveDraftBtn = document.querySelector('[data-action="save-draft"]');

    // Load users for recipient selection
    loadRecipients();

    // Check if replying to an email
    const urlParams = new URLSearchParams(window.location.search);
    const replyToId = urlParams.get('reply');
    const toUserId = urlParams.get('to');

    if (replyToId && toUserId) {
      // Load original email to get subject
      MondoAPI.email.get(replyToId).then(response => {
        if (response.success) {
          const originalSubject = response.email.subject;
          subjectInput.value = originalSubject.startsWith('Re:')
            ? originalSubject
            : `Re: ${originalSubject}`;
        }
      });

      if (recipientSelect) {
        recipientSelect.value = toUserId;
      }
    }

    // Send email
    if (sendBtn) {
      sendBtn.addEventListener('click', async function() {
        await sendEmail(false);
      });
    }

    // Save draft
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', async function() {
        await sendEmail(true);
      });
    }
  }

  // Load recipients
  async function loadRecipients() {
    const recipientSelect = document.querySelector('#recipient');
    if (!recipientSelect) return;

    try {
      const response = await MondoAPI.users.getAll();
      if (response.success) {
        recipientSelect.innerHTML = '<option value="">Select recipient...</option>' +
          response.users.map(user =>
            `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
          ).join('');
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  }

  // Send or save draft email
  async function sendEmail(isDraft) {
    const recipientSelect = document.querySelector('#recipient');
    const subjectInput = document.querySelector('#subject');
    const bodyInput = document.querySelector('#email-body');

    const toUserId = parseInt(recipientSelect.value);
    const subject = subjectInput.value.trim();
    const body = bodyInput.value.trim();

    if (!toUserId || !subject || !body) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await MondoAPI.email.send({
        to_user_id: toUserId,
        subject,
        body,
        is_draft: isDraft
      });

      if (response.success) {
        alert(isDraft ? 'Draft saved successfully' : 'Email sent successfully');
        window.location.href = isDraft ? 'email-inbox.html' : 'email-inbox.html';
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  }

  // Toggle star
  async function toggleStar(emailId) {
    try {
      // Get current email state
      const emailResponse = await MondoAPI.email.get(emailId);
      if (emailResponse.success) {
        const isStarred = emailResponse.email.is_starred;

        // Toggle star
        await MondoAPI.email.update(emailId, {
          is_starred: !isStarred
        });

        // Reload page or update UI
        location.reload();
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  }

  // Delete email
  async function deleteEmail(emailId) {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      await MondoAPI.email.delete(emailId);
      window.location.href = 'email-inbox.html';
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email');
    }
  }

  // Update unread count
  async function updateUnreadCount() {
    try {
      const response = await MondoAPI.email.getUnreadCount();
      if (response.success && response.unread > 0) {
        const unreadBadges = document.querySelectorAll('.email-unread-count');
        unreadBadges.forEach(badge => {
          badge.textContent = response.unread;
          badge.style.display = 'inline-block';
        });
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }

  // Helper functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

})();
