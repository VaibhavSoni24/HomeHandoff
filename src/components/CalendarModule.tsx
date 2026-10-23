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
    <div className="module-container glass-panel">
      {/* Header bar */}
      <div className="module-header">
        <div className="module-title-group">
          <div className="module-icon-wrap cyan">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="module-title">Household Calendar & Visit Blocks</h2>
            <p className="module-subtitle">Synchronized family schedule, visitor blocks, and automated prep windows</p>
          </div>
        </div>

        <div className="module-actions">
          <div className="filter-pill-group">
            {['all', 'visitor', 'family', 'routine', 'errand'].map(type => (
              <button
                key={type}
                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <button className="primary-add-btn" onClick={() => { setFormError(null); setShowAddModal(true); }}>
            <Plus size={16} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Events List / Timeline Cards */}
      <div className="calendar-grid">
        {filteredEvents.length > 0 ? (
          filteredEvents.map(event => {
            const isVisitor = event.type === 'visitor';
            const startDate = new Date(event.start);
            const validDate = !isNaN(startDate.getTime());

            return (
              <div 
                key={event.id} 
                className={`calendar-event-card ${isVisitor ? 'visitor-event-highlight' : ''}`}
              >
                {isVisitor && (
                  <div className="visitor-ribbon">
                    <span>Alexa+ Coordinated Visit</span>
                  </div>
                )}

                <div className="event-card-top">
                  <div className="event-date-badge">
                    <span className="badge-month">
                      {validDate ? startDate.toLocaleString('en-US', { month: 'short' }) : 'Date'}
                    </span>
                    <span className="badge-day">
                      {validDate ? startDate.getDate() : '--'}
                    </span>
                  </div>

                  <div className="event-main-meta">
                    <div className="event-title-row">
                      <h3 className="event-card-title">{event.title}</h3>
                      <span className={`event-type-tag ${event.type}`}>{event.type}</span>
                    </div>

                    <div className="event-timing-row">
                      <Clock size={14} className="text-secondary" />
                      <span>{formatDateTime(event.start)} — {formatTimeOnly(event.end)}</span>
                    </div>

                    {event.location && (
                      <div className="event-location-row">
                        <MapPin size={14} className="text-secondary" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {event.notes && (
                  <div className="event-notes-box">
                    <p>{event.notes}</p>
                  </div>
                )}

                {event.attendees && event.attendees.length > 0 && (
                  <div className="event-attendees-bar">
                    <Users size={13} className="text-secondary" />
                    <span>Attendees: <strong>{event.attendees.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-module-state">
            <CalendarIcon size={36} className="text-muted" />
            <p>No calendar events match the current filter.</p>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card glass-panel-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Household Calendar Event</h3>
            <form onSubmit={handleCreateEvent} className="modal-form">
              {formError && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Event Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. In-laws Visiting, Dentist Appointment"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    value={newEventType} 
                    onChange={e => setNewEventType(e.target.value as EventType)}
                  >
                    <option value="family">Family</option>
                    <option value="visitor">Visitor</option>
                    <option value="routine">Routine</option>
                    <option value="errand">Errand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Home, Airport, Clinic"
                    value={newEventLocation}
                    onChange={e => setNewEventLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={newEventStart}
                    onChange={e => setNewEventStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEventEnd}
                    onChange={e => setNewEventEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
