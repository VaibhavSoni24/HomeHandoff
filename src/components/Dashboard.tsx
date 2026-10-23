import React from 'react';
import { 
  Calendar, 
  CheckSquare, 
  ShoppingCart, 
  Cpu, 
  ArrowRight, 
  Clock, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import type { HouseholdState } from '../types/household';
import { formatDateTime, getRelativeTimeLabel, findNextUpcomingEvent } from '../utils/dateUtils';
import { computePlanReadiness } from '../utils/readiness';

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
  const readiness = computePlanReadiness(state);
  const totalTasks = state.tasks.length;
  const completedTotalTasks = state.tasks.filter(t => t.completed).length;
  const pendingTotalTasks = totalTasks - completedTotalTasks;
  const unpurchasedShopping = state.shoppingItems.filter(s => !s.completed).length;
  const scheduledRoutines = state.routines.filter(r => r.enabled).length;

  const nextEventResult = React.useMemo(() => {
    return findNextUpcomingEvent(state.events);
  }, [state.events]);

  // Urgent pending tasks
  const pendingTasksList = state.tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
    .slice(0, 5);

  return (
    <div className="dashboard-content-layout">
      {/* Primary Section: Active Plan Overview or Empty State */}
      {activePlan ? (
        <section className="active-plan-card surface-card" aria-label="Active Household Plan">
          <div className="plan-card-header">
            <div className="plan-title-block">
              <div className="plan-tag-row">
                <span className="badge badge-primary">Active Plan</span>
                <span className="badge badge-neutral">Autonomous Coordination</span>
              </div>
              <h2 className="plan-title">{activePlan.title}</h2>
              <p className="plan-desc">{activePlan.description}</p>
            </div>
            <div className="plan-actions-block">
              <button 
                type="button" 
                className="btn-outline-primary"
                onClick={() => onSelectTab('tasks')}
              >
                <span>View All Chores</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Clean Horizontal Progress Bar replacing circular dial */}
          <div className="plan-progress-section">
            <div className="progress-labels-row">
              <span className="progress-label-main">
                Task Preparation Completion: <strong>{readiness.completedTasks} of {readiness.totalTasks} completed</strong>
              </span>
              <span className="progress-percentage-val">{readiness.readinessPercent}%</span>
            </div>
            <div className="progress-bar-track" role="progressbar" aria-valuenow={readiness.readinessPercent} aria-valuemin={0} aria-valuemax={100}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${readiness.readinessPercent}%` }} 
              />
            </div>
          </div>

          <div className="plan-meta-row">
            <div className="plan-meta-item">
              <Clock size={15} className="meta-icon" />
              <span>Target Arrival: <strong>{formatDateTime(activePlan.targetDate)}</strong> ({getRelativeTimeLabel(activePlan.targetDate)})</span>
            </div>
            <div className="plan-meta-item">
              <ShoppingCart size={15} className="meta-icon" />
              <span>Guest Amenities: <strong>{unpurchasedShopping} items pending on shopping list</strong></span>
            </div>
          </div>
        </section>
      ) : (
        <section className="welcome-banner-card surface-card">
          <div className="welcome-header">
            <span className="badge badge-neutral">Household Idle</span>
            <h2 className="welcome-heading">HomeHandoff Multi-Step Household Coordination</h2>
            <p className="welcome-body">
              No active visit plan is currently running. All household calendars, tasks, and routines are synchronized.
              To see autonomous multi-step planning in action, run Scenario 1 below or type an instruction in the Assistant tab.
            </p>
          </div>
          <div className="welcome-actions">
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => onTriggerScenario('My parents are visiting Friday. Prepare the house.')}
            >
              <Sparkles size={15} />
              <span>Start Scenario 1: Parents Visit Friday</span>
            </button>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => onSelectTab('chat')}
            >
              <span>Open Assistant</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}

      {/* 4 Useful Summary Cards */}
      <section className="metrics-grid" aria-label="Household Summary Metrics">
        {/* Next Calendar Event */}
        <div className="metric-card surface-card">
          <div className="metric-card-top">
            <span className="metric-card-label">Next Calendar Event</span>
            <span className="metric-icon-box"><Calendar size={16} /></span>
          </div>
          <div className="metric-card-body">
            {nextEventResult ? (
              <>
                <div className="metric-main-value">
                  {nextEventResult.event.title}
                  {nextEventResult.isInProgress && (
                    <span className="badge badge-accent" style={{ marginLeft: 6, fontSize: '0.72rem', verticalAlign: 'middle' }}>
                      In Progress
                    </span>
                  )}
                </div>
                <div className="metric-subtext">
                  {nextEventResult.isInProgress ? (
                    <span>Happening now (ends {formatDateTime(nextEventResult.event.end)})</span>
                  ) : (
                    <span>{formatDateTime(nextEventResult.event.start)} ({getRelativeTimeLabel(nextEventResult.event.start)})</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="metric-main-value">No Upcoming Events</div>
                <div className="metric-subtext">All scheduled events are completed</div>
              </>
            )}
          </div>
          <button type="button" className="metric-card-link" onClick={() => onSelectTab('calendar')}>
            <span>Open Calendar</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Tasks Summary */}
        <div className="metric-card surface-card">
          <div className="metric-card-top">
            <span className="metric-card-label">Pending Chores & Tasks</span>
            <span className="metric-icon-box"><CheckSquare size={16} /></span>
          </div>
          <div className="metric-card-body">
            <div className="metric-main-value">{pendingTotalTasks} Open</div>
            <div className="metric-subtext">{completedTotalTasks} completed across household</div>
          </div>
          <button type="button" className="metric-card-link" onClick={() => onSelectTab('tasks')}>
            <span>Manage Chores</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Shopping Summary */}
        <div className="metric-card surface-card">
          <div className="metric-card-top">
            <span className="metric-card-label">Shopping Checklist</span>
            <span className="metric-icon-box"><ShoppingCart size={16} /></span>
          </div>
          <div className="metric-card-body">
            <div className="metric-main-value">{unpurchasedShopping} Items Pending</div>
            <div className="metric-subtext">Organized by grocery aisle</div>
          </div>
          <button type="button" className="metric-card-link" onClick={() => onSelectTab('shopping')}>
            <span>View Shopping List</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Smart Routines Summary */}
        <div className="metric-card surface-card">
          <div className="metric-card-top">
            <span className="metric-card-label">Smart Routines (Simulated)</span>
            <span className="metric-icon-box"><Cpu size={16} /></span>
          </div>
          <div className="metric-card-body">
            <div className="metric-main-value">{scheduledRoutines} Scheduled</div>
            <div className="metric-subtext">Thermostat, lights, lock & vacuum</div>
          </div>
          <button type="button" className="metric-card-link" onClick={() => onSelectTab('routines')}>
            <span>Review Automation</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </section>

      {/* Immediate Tasks Quick Board */}
      <section className="dashboard-tasks-section surface-card">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">Priority Tasks</h3>
            <p className="section-desc">Quickly check off preparation tasks directly from the dashboard</p>
          </div>
          <button 
            type="button" 
            className="btn-link"
            onClick={() => onSelectTab('tasks')}
          >
            <span>View all {totalTasks} tasks</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {pendingTasksList.length > 0 ? (
          <div className="dashboard-task-list">
            {pendingTasksList.map(task => (
              <div key={task.id} className="task-row-item">
                <label className="task-checkbox-label">
                  <input
                    type="checkbox"
                    className="task-checkbox-input"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                  />
                  <div className="task-text-info">
                    <span className="task-title-text">{task.title}</span>
                    <div className="task-meta-line">
                      <span className="task-assignee-pill">{task.assignee}</span>
                      <span className={`task-priority-tag ${task.priority}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="task-time-estimate">{task.estimatedMinutes} mins</span>
                      <span className="task-due-date">{task.dueDate ? `Due: ${formatDateTime(task.dueDate)}` : 'No due date'}</span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-box">
            <CheckCircle2 size={24} className="empty-icon-emerald" />
            <p>All priority household tasks are currently completed!</p>
          </div>
        )}
      </section>
    </div>
  );
};
