import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus } from 'lucide-react';
import type { CalendarEvent, EventType } from '../types/household';
import { formatDateTime, formatTimeOnly } from '../utils/dateUtils';

interface CalendarModuleProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({ events, onAddEvent }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('family');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventStart) return;

    onAddEvent({
      title: newEventTitle,
      type: newEventType,
      start: new Date(newEventStart).toISOString(),
      end: newEventEnd ? new Date(newEventEnd).toISOString() : new Date(newEventStart).toISOString(),
      location: newEventLocation || 'Home',
      attendees: ['Vaibhav', 'Sarah']
    });

    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventStart('');
    setNewEventEnd('');
    setNewEventLocation('');
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

          <button className="primary-add-btn" onClick={() => setShowAddModal(true)}>
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
                    <span className="badge-month">{new Date(event.start).toLocaleString('en-US', { month: 'short' })}</span>
                    <span className="badge-day">{new Date(event.start).getDate()}</span>
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
              <div className="form-group">
                <label>Event Title</label>
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
                  <label>Start Date & Time</label>
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
