import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, AlertCircle } from 'lucide-react';
import type { CalendarEvent, EventType } from '../types/household';
import { formatDateTime, formatTimeOnly } from '../utils/dateUtils';

interface CalendarModuleProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({ events, onAddEvent }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('family');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  }).sort((a, b) => {
    const timeA = new Date(a.start).getTime();
    const timeB = new Date(b.start).getTime();
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeA - timeB;
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = newEventTitle.trim();
    if (!title) {
      setFormError('Please enter an event title.');
      return;
    }

    if (!newEventStart) {
      setFormError('Start date & time is required.');
      return;
    }

    const startDate = new Date(newEventStart);
    if (isNaN(startDate.getTime())) {
      setFormError('Please select a valid start date and time.');
      return;
    }

    let endDate = startDate;
    if (newEventEnd) {
      const parsedEnd = new Date(newEventEnd);
      if (isNaN(parsedEnd.getTime())) {
        setFormError('Please select a valid end date and time.');
        return;
      }
      if (parsedEnd.getTime() < startDate.getTime()) {
        setFormError('End date/time must be at or after the start date/time.');
        return;
      }
      endDate = parsedEnd;
    }

    onAddEvent({
      title,
      type: newEventType,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: newEventLocation.trim() || 'Home',
      attendees: ['Vaibhav', 'Sarah']
    });

    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventStart('');
    setNewEventEnd('');
    setNewEventLocation('');
    setFormError(null);
  };

  return (
    <div className="module-panel surface-card">
      {/* Header bar */}
      <div className="module-header-row">
        <div>
          <h2 className="module-heading">Household Calendar</h2>
          <p className="module-subheading">Family schedules, visitor arrival blocks, and preparation windows</p>
        </div>

        <div className="module-header-actions">
          <div className="filter-button-group">
            {['all', 'visitor', 'family', 'routine', 'errand'].map(type => (
              <button
                key={type}
                type="button"
                className={`btn-filter ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => { setFormError(null); setShowAddModal(true); }}
          >
            <Plus size={15} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="events-stream-list">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => {
            const isVisitor = event.type === 'visitor';
            const startDate = new Date(event.start);
            const validDate = !isNaN(startDate.getTime());

            return (
              <div 
                key={event.id} 
                className={`event-list-row ${isVisitor ? 'event-row-visitor' : ''}`}
              >
                <div className="event-date-col">
                  {validDate ? (
                    <div className="date-tile">
                      <span className="date-tile-month">
                        {startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="date-tile-day">{startDate.getDate()}</span>
                    </div>
                  ) : (
                    <div className="date-tile">
                      <span className="date-tile-day">—</span>
                    </div>
                  )}
                </div>

                <div className="event-info-col">
                  <div className="event-title-line">
                    <h3 className="event-title">{event.title}</h3>
                    <span className={`event-type-badge ${event.type}`}>
                      {event.type.toUpperCase()}
                    </span>
                    {isVisitor && (
                      <span className="badge badge-accent">Coordinated Visit</span>
                    )}
                  </div>

                  <div className="event-meta-line">
                    <span className="event-meta-item">
                      <Clock size={13} />
                      <span>{formatDateTime(event.start)} — {formatTimeOnly(event.end)}</span>
                    </span>

                    {event.location && (
                      <span className="event-meta-item">
                        <MapPin size={13} />
                        <span>{event.location}</span>
                      </span>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <span className="event-meta-item">
                        <Users size={13} />
                        <span>{event.attendees.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  {event.notes && (
                    <p className="event-notes-text">{event.notes}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state-card">
            <CalendarIcon size={24} className="text-muted" />
            <p>No calendar events found matching the "{filterType}" filter.</p>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog surface-card" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="add-event-title">
            <div className="modal-header">
              <h3 id="add-event-title" className="modal-title">Schedule New Event</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="modal-form">
              {formError && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="evt-title" className="form-label">Event Title *</label>
                <input
                  id="evt-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mom & Dad Visit, HVAC Service"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="evt-type" className="form-label">Event Category</label>
                  <select
                    id="evt-type"
                    className="form-select"
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value as EventType)}
                  >
                    <option value="visitor">Visitor Block</option>
                    <option value="family">Family Gathering</option>
                    <option value="errand">Errand</option>
                    <option value="routine">Routine</option>
                    <option value="preparation">Preparation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="evt-location" className="form-label">Location</label>
                  <input
                    id="evt-location"
                    type="text"
                    className="form-input"
                    placeholder="Home - Guest Suite"
                    value={newEventLocation}
                    onChange={e => setNewEventLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="evt-start" className="form-label">Start Date & Time *</label>
                  <input
                    id="evt-start"
                    type="datetime-local"
                    className="form-input"
                    value={newEventStart}
                    onChange={e => setNewEventStart(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="evt-end" className="form-label">End Date & Time</label>
                  <input
                    id="evt-end"
                    type="datetime-local"
                    className="form-input"
                    value={newEventEnd}
                    onChange={e => setNewEventEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
