// Calendar page integration with backend API
(function() {
  'use strict';

  // Require authentication
  if (!MondoAPI.requireAuth()) {
    return;
  }

  // Wait for FullCalendar to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    let calendar;

    // Initialize FullCalendar with API integration
    if (typeof FullCalendar !== 'undefined') {
      calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: ['interaction', 'dayGrid', 'timeGrid', 'list'],
        header: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        },
        editable: true,
        droppable: true,
        selectable: true,

        // Load events from API
        events: async function(info, successCallback, failureCallback) {
          try {
            const response = await MondoAPI.calendar.getEvents(
              info.startStr,
              info.endStr
            );

            if (response.success) {
              successCallback(response.events);
            } else {
              failureCallback(new Error('Failed to load events'));
            }
          } catch (error) {
            console.error('Error loading events:', error);
            failureCallback(error);
          }
        },

        // Handle event select (create new event)
        select: function(info) {
          showEventModal({
            start: info.startStr,
            end: info.endStr,
            allDay: info.allDay
          });
        },

        // Handle event click (edit event)
        eventClick: function(info) {
          showEventModal({
            id: info.event.id,
            title: info.event.title,
            description: info.event.extendedProps.description,
            start: info.event.start.toISOString(),
            end: info.event.end ? info.event.end.toISOString() : null,
            allDay: info.event.allDay,
            color: info.event.backgroundColor
          });
        },

        // Handle event drop (move event)
        eventDrop: async function(info) {
          try {
            await MondoAPI.calendar.updateEvent(info.event.id, {
              start: info.event.start.toISOString(),
              end: info.event.end ? info.event.end.toISOString() : null,
              all_day: info.event.allDay
            });
          } catch (error) {
            console.error('Error updating event:', error);
            info.revert();
            alert('Failed to update event');
          }
        },

        // Handle event resize
        eventResize: async function(info) {
          try {
            await MondoAPI.calendar.updateEvent(info.event.id, {
              start: info.event.start.toISOString(),
              end: info.event.end ? info.event.end.toISOString() : null
            });
          } catch (error) {
            console.error('Error resizing event:', error);
            info.revert();
            alert('Failed to resize event');
          }
        }
      });

      calendar.render();
    }

    // Event modal handling
    function showEventModal(eventData) {
      // Create or get modal
      let modal = document.getElementById('eventModal');
      if (!modal) {
        modal = createEventModal();
      }

      // Populate modal with event data
      const modalTitle = modal.querySelector('#modalTitle');
      const titleInput = modal.querySelector('#eventTitle');
      const descInput = modal.querySelector('#eventDescription');
      const startInput = modal.querySelector('#eventStart');
      const endInput = modal.querySelector('#eventEnd');
      const colorInput = modal.querySelector('#eventColor');
      const deleteBtn = modal.querySelector('#deleteEvent');
      const saveBtn = modal.querySelector('#saveEvent');

      if (eventData.id) {
        modalTitle.textContent = 'Edit Event';
        deleteBtn.style.display = 'block';
      } else {
        modalTitle.textContent = 'Create Event';
        deleteBtn.style.display = 'none';
      }

      titleInput.value = eventData.title || '';
      descInput.value = eventData.description || '';
      startInput.value = eventData.start ? eventData.start.substring(0, 16) : '';
      endInput.value = eventData.end ? eventData.end.substring(0, 16) : '';
      colorInput.value = eventData.color || '#4CAF50';

      // Save event handler
      saveBtn.onclick = async function() {
        const title = titleInput.value.trim();
        if (!title) {
          alert('Please enter an event title');
          return;
        }

        const eventPayload = {
          title,
          description: descInput.value.trim(),
          start: startInput.value,
          end: endInput.value || null,
          all_day: !startInput.value.includes('T'),
          color: colorInput.value
        };

        try {
          if (eventData.id) {
            // Update existing event
            await MondoAPI.calendar.updateEvent(eventData.id, eventPayload);
          } else {
            // Create new event
            await MondoAPI.calendar.createEvent(eventPayload);
          }

          // Refresh calendar
          calendar.refetchEvents();

          // Close modal
          $(modal).modal('hide');
        } catch (error) {
          console.error('Error saving event:', error);
          alert('Failed to save event');
        }
      };

      // Delete event handler
      deleteBtn.onclick = async function() {
        if (!confirm('Are you sure you want to delete this event?')) {
          return;
        }

        try {
          await MondoAPI.calendar.deleteEvent(eventData.id);

          // Refresh calendar
          calendar.refetchEvents();

          // Close modal
          $(modal).modal('hide');
        } catch (error) {
          console.error('Error deleting event:', error);
          alert('Failed to delete event');
        }
      };

      // Show modal
      $(modal).modal('show');
    }

    // Create event modal HTML
    function createEventModal() {
      const modalHTML = `
        <div class="modal fade" id="eventModal" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="modalTitle">Event</h5>
                <button type="button" class="close" data-dismiss="modal">
                  <span>&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <form>
                  <div class="form-group">
                    <label for="eventTitle">Title *</label>
                    <input type="text" class="form-control" id="eventTitle" required>
                  </div>
                  <div class="form-group">
                    <label for="eventDescription">Description</label>
                    <textarea class="form-control" id="eventDescription" rows="3"></textarea>
                  </div>
                  <div class="form-group">
                    <label for="eventStart">Start *</label>
                    <input type="datetime-local" class="form-control" id="eventStart" required>
                  </div>
                  <div class="form-group">
                    <label for="eventEnd">End</label>
                    <input type="datetime-local" class="form-control" id="eventEnd">
                  </div>
                  <div class="form-group">
                    <label for="eventColor">Color</label>
                    <input type="color" class="form-control" id="eventColor" value="#4CAF50">
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-danger" id="deleteEvent" style="display:none;">
                  Delete
                </button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary" id="saveEvent">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      return document.getElementById('eventModal');
    }
  });

})();
