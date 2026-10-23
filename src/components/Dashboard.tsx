import React from 'react';
import { 
  Calendar, 
  CheckSquare, 
  ShoppingCart, 
  Cpu, 
  ArrowRight, 
  Clock, 
  Sparkles
} from 'lucide-react';
import type { HouseholdState } from '../types/household';
import { formatDateTime, getRelativeTimeLabel } from '../utils/dateUtils';

interface DashboardProps {
  state: HouseholdState;
  onSelectTab: (tabId: string) => void;
  onToggleTask: (taskId: string) => void;
  onTriggerScenario: (prompt: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onSelectTab,
  onToggleTask,
  onTriggerScenario
}) => {
  const activePlan = state.activePlan;
  const planTasks = state.tasks.filter(t => activePlan && t.planId === activePlan.id);
  const completedPlanTasks = planTasks.filter(t => t.completed);
  const totalTasks = state.tasks.length;
  const completedTotalTasks = state.tasks.filter(t => t.completed).length;
  const pendingTotalTasks = totalTasks - completedTotalTasks;
  const unpurchasedShopping = state.shoppingItems.filter(s => !s.completed).length;
  const armedRoutines = state.routines.filter(r => r.enabled).length;

  const readinessPercent = planTasks.length > 0 
    ? Math.round((completedPlanTasks.length / planTasks.length) * 100) 
    : (activePlan ? 0 : 100);

  const nextEvent = React.useMemo(() => {
    if (state.events.length === 0) return undefined;
    const sorted = [...state.events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    return sorted[0];
  }, [state.events]);

  // Urgent pending tasks
  const pendingTasksList = state.tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
    .slice(0, 4);

  return (
    <div className="dashboard-container">
      {/* Top Banner: Active Plan or Getting Started */}
      {activePlan ? (
        <div className="active-plan-banner glass-panel-elevated animate-fade-in">
          <div className="plan-banner-left">
            <div className="plan-tag-row">
              <span className="badge badge-cyan">Active Multi-Step Plan</span>
              <span className="badge badge-emerald">Autonomous Coordination</span>
            </div>
            <h2 className="plan-banner-title">{activePlan.title}</h2>
            <p className="plan-banner-desc">{activePlan.description}</p>
            
            <div className="plan-banner-meta">
              <div className="meta-item">
                <Clock size={15} className="text-cyan" />
                <span>Target Arrival: <strong>{formatDateTime(activePlan.targetDate)}</strong> ({getRelativeTimeLabel(activePlan.targetDate)})</span>
              </div>
              <div className="meta-item">
                <CheckSquare size={15} className="text-emerald" />
                <span>Tasks: <strong>{completedPlanTasks.length} of {planTasks.length} Completed</strong></span>
              </div>
            </div>
          </div>

          <div className="plan-banner-right">
            <div className="readiness-dial-card">
              <div className="readiness-dial-circle">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path 
                    className="circle-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path 
                    className="circle"
                    strokeDasharray={`${readinessPercent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{readinessPercent}%</text>
                </svg>
              </div>
              <span className="dial-caption">Household Readiness</span>
              <button 
                className="view-plan-timeline-btn"
                onClick={() => onSelectTab('tasks')}
              >
                <span>View Chores</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="welcome-banner glass-panel-elevated animate-fade-in">
          <div className="welcome-content">
            <div className="welcome-badge">
              <Sparkles size={14} className="text-cyan" />
              <span>Amazon Developer Hackathon — Alexa+ Track</span>
            </div>
            <h2>HomeHandoff Multi-Step Household Coordination</h2>
            <p>
              Experience how natural language instructions are translated into real-time calendar updates, 
              chore distribution, grocery orders, and smart home routines.
            </p>
            <div className="quick-start-buttons">
              <button 
                className="primary-hero-btn"
                onClick={() => onTriggerScenario('My parents are visiting Friday. Prepare the house.')}
              >
                <Sparkles size={16} />
                <span>Run Scenario 1: Parents Visit Friday</span>
              </button>
              <button 
                className="secondary-hero-btn"
                onClick={() => onSelectTab('chat')}
              >
                <span>Open Conversational Agent</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel" onClick={() => onSelectTab('calendar')}>
          <div className="metric-header">
            <span className="metric-title">Calendar Schedule</span>
            <div className="metric-icon-wrap cyan">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{state.events.length}</span>
            <span className="metric-sub">
              Next: <strong>{nextEvent?.title || 'None'}</strong>
            </span>
          </div>
          <div className="metric-footer">
            <span>{nextEvent ? formatDateTime(nextEvent.start) : 'No upcoming events'}</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="metric-card glass-panel" onClick={() => onSelectTab('tasks')}>
          <div className="metric-header">
            <span className="metric-title">Pending Chores</span>
            <div className="metric-icon-wrap emerald">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{pendingTotalTasks}</span>
            <span className="metric-sub">
              {completedTotalTasks} completed out of {totalTasks}
            </span>
          </div>
          <div className="metric-footer">
            <span>{planTasks.filter(t => !t.completed).length} visit prep tasks</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="metric-card glass-panel" onClick={() => onSelectTab('shopping')}>
          <div className="metric-header">
            <span className="metric-title">Shopping Items</span>
            <div className="metric-icon-wrap amber">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{unpurchasedShopping}</span>
            <span className="metric-sub">Unpurchased items on list</span>
          </div>
          <div className="metric-footer">
            <span>Simulated Alexa Shopping List</span>
            <ArrowRight size={13} />
          </div>
        </div>

        <div className="metric-card glass-panel" onClick={() => onSelectTab('routines')}>
          <div className="metric-header">
            <span className="metric-title">Smart Routines</span>
            <div className="metric-icon-wrap purple">
              <Cpu size={18} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{armedRoutines}</span>
            <span className="metric-sub">Active Alexa+ Routines</span>
          </div>
          <div className="metric-footer">
            <span>HVAC, Lighting, Lock & Vacuum</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Tasks & Household Hub */}
      <div className="dashboard-columns">
        {/* Urgent Tasks */}
        <div className="dashboard-col glass-panel">
          <div className="col-header">
            <div className="col-title-group">
              <CheckSquare size={18} className="text-cyan" />
              <h3>Priority Chores & Checkpoints</h3>
            </div>
            <button className="col-action-btn" onClick={() => onSelectTab('tasks')}>
              View All ({state.tasks.length})
            </button>
          </div>

          <div className="priority-tasks-list">
            {pendingTasksList.length > 0 ? (
              pendingTasksList.map(task => (
                <div key={task.id} className="priority-task-item">
                  <button 
                    className="task-checkbox-btn"
                    onClick={() => onToggleTask(task.id)}
                    title="Click to check off task"
                  >
                    <span className="checkbox-box"></span>
                  </button>
                  <div className="task-content">
                    <span className="task-title-text">{task.title}</span>
                    <div className="task-meta-row">
                      <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                      <span className="assignee-tag">👤 {task.assignee}</span>
                      <span className="due-tag"><Clock size={12} /> {formatDateTime(task.dueDate)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-card">
                <CheckSquare size={32} className="text-emerald" />
                <p>All chores and preparation tasks are completed!</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Smart Home Summary */}
        <div className="dashboard-col glass-panel">
          <div className="col-header">
            <div className="col-title-group">
              <Calendar size={18} className="text-cyan" />
              <h3>Household Schedule & Routines</h3>
            </div>
            <button className="col-action-btn" onClick={() => onSelectTab('calendar')}>
              View Calendar
            </button>
          </div>

          <div className="events-mini-list">
            {state.events.slice(0, 3).map(event => (
              <div key={event.id} className={`mini-event-item ${event.type}`}>
                <div className="mini-event-indicator"></div>
                <div className="mini-event-details">
                  <div className="mini-event-top">
                    <span className="mini-event-title">{event.title}</span>
                    <span className="mini-event-badge">{event.type}</span>
                  </div>
                  <div className="mini-event-time">
                    <Clock size={12} />
                    <span>{formatDateTime(event.start)}</span>
                  </div>
                  {event.location && (
                    <span className="mini-event-loc">📍 {event.location}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Household Members */}
          <div className="household-members-section">
            <h4 className="members-subheading">Active Household Members</h4>
            <div className="members-avatars-row">
              {state.householdMembers.map(m => (
                <div key={m.id} className="member-avatar-chip">
                  <span className="avatar-circle" style={{ backgroundColor: m.avatarColor }}>
                    {m.name[0]}
                  </span>
                  <div className="member-info">
                    <span className="member-name">{m.name}</span>
                    <span className="member-role">{m.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
