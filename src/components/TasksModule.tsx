import React, { useState } from 'react';
import { 
  Plus, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import type { Task, TaskCategory, TaskPriority } from '../types/household';
import { formatDateTime } from '../utils/dateUtils';

interface TasksModuleProps {
  tasks: Task[];
  activePlanTitle?: string;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

export const TasksModule: React.FC<TasksModuleProps> = ({
  tasks,
  activePlanTitle,
  onToggleTask,
  onAddTask
}) => {
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('cleaning');
  const [newAssignee, setNewAssignee] = useState('Vaibhav');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstMinutes, setNewEstMinutes] = useState(30);

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    if (filterStatus === 'open' && t.completed) return false;
    if (filterStatus === 'completed' && !t.completed) return false;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = newTitle.trim();
    if (!title) {
      setFormError('Please enter a task description.');
      return;
    }

    const mins = Number(newEstMinutes);
    if (isNaN(mins) || mins <= 0 || mins > 480) {
      setFormError('Estimated minutes must be a positive number between 1 and 480.');
      return;
    }

    let dueDateIso = new Date().toISOString();
    if (newDueDate) {
      const parsedDate = new Date(newDueDate);
      if (isNaN(parsedDate.getTime())) {
        setFormError('Please select a valid due date and time.');
        return;
      }
      dueDateIso = parsedDate.toISOString();
    }

    onAddTask({
      title,
      category: newCategory,
      assignee: newAssignee,
      priority: newPriority,
      dueDate: dueDateIso,
      completed: false,
      estimatedMinutes: mins
    });

    setShowAddModal(false);
    setNewTitle('');
    setNewDueDate('');
    setFormError(null);
  };

  return (
    <div className="module-panel surface-card">
      {/* Header Bar */}
      <div className="module-header-row">
        <div>
          <h2 className="module-heading">Chores & Preparation Tasks</h2>
          <p className="module-subheading">
            {activePlanTitle 
              ? `Synchronized with active plan: "${activePlanTitle}"` 
              : 'Assigned household chores and preparation checklist'}
          </p>
        </div>

        <div className="module-header-actions">
          <div className="filter-button-group">
            <button 
              type="button"
              className={`btn-filter ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({tasks.length})
            </button>
            <button 
              type="button"
              className={`btn-filter ${filterStatus === 'open' ? 'active' : ''}`}
              onClick={() => setFilterStatus('open')}
            >
              Open ({tasks.length - completedCount})
            </button>
            <button 
              type="button"
              className={`btn-filter ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Done ({completedCount})
            </button>
          </div>

          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => { setFormError(null); setShowAddModal(true); }}
          >
            <Plus size={15} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Overview Progress & Assignee Filters Bar */}
      <div className="tasks-controls-bar">
        <div className="tasks-progress-inline">
          <span className="tasks-progress-count">
            <strong>{completedCount} of {tasks.length}</strong> tasks completed ({progressPercent}%)
          </span>
          <div className="tasks-progress-track">
            <div className="tasks-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="assignee-filter-group">
          <span className="filter-label">Assignee:</span>
          {['all', 'Vaibhav', 'Sarah', 'Shared'].map(name => (
            <button
              key={name}
              type="button"
              className={`btn-filter-sm ${filterAssignee === name ? 'active' : ''}`}
              onClick={() => setFilterAssignee(name)}
            >
              {name === 'all' ? 'All Members' : name}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="compact-task-list">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => {
            const isPlanTask = !!task.planId;
            return (
              <div 
                key={task.id} 
                className={`task-item-row ${task.completed ? 'task-row-completed' : ''}`}
              >
                <label className="task-checkbox-container">
                  <input
                    type="checkbox"
                    className="task-checkbox-input"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${task.title}`}
                  />
                  <div className="task-content-block">
                    <div className="task-primary-line">
                      <span className={`task-title-label ${task.completed ? 'completed-text' : ''}`}>
                        {task.title}
                      </span>
                      {isPlanTask && (
                        <span className="badge badge-accent">Plan Task</span>
                      )}
                    </div>

                    <div className="task-metadata-row">
                      <span className="meta-assignee">
                        <User size={12} />
                        <span>{task.assignee}</span>
                      </span>

                      <span className={`meta-priority-badge ${task.priority}`}>
                        {task.priority.toUpperCase()}
                      </span>

                      <span className="meta-time">
                        <Clock size={12} />
                        <span>{task.estimatedMinutes} mins</span>
                      </span>

                      <span className="meta-due">
                        Due: {formatDateTime(task.dueDate)}
                      </span>
                    </div>

                    {task.notes && (
                      <p className="task-notes-snippet">{task.notes}</p>
                    )}
                  </div>
                </label>
              </div>
            );
          })
        ) : (
          <div className="empty-state-card">
            <CheckCircle2 size={24} className="text-muted" />
            <p>No chores or tasks found matching the selected filters.</p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog surface-card" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="add-task-title">
            <div className="modal-header">
              <h3 id="add-task-title" className="modal-title">Create New Task</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="modal-form">
              {formError && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="task-title" className="form-label">Task Title / Action *</label>
                <input
                  id="task-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Set up clean towels, vacuum living room"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="task-assignee" className="form-label">Assignee</label>
                  <select
                    id="task-assignee"
                    className="form-select"
                    value={newAssignee}
                    onChange={e => setNewAssignee(e.target.value)}
                  >
                    <option value="Vaibhav">Vaibhav</option>
                    <option value="Sarah">Sarah</option>
                    <option value="Shared">Shared Household</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-category" className="form-label">Category</label>
                  <select
                    id="task-category"
                    className="form-select"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as TaskCategory)}
                  >
                    <option value="guest_room">Guest Suite</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="groceries">Groceries</option>
                    <option value="smart_home">Smart Home Setup</option>
                    <option value="logistics">Logistics</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="task-priority" className="form-label">Priority</label>
                  <select
                    id="task-priority"
                    className="form-select"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as TaskPriority)}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-est" className="form-label">Est. Time (Minutes) *</label>
                  <input
                    id="task-est"
                    type="number"
                    min="1"
                    max="480"
                    className="form-input"
                    value={newEstMinutes}
                    onChange={e => setNewEstMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="task-due" className="form-label">Due Date & Time</label>
                <input
                  id="task-due"
                  type="datetime-local"
                  className="form-input"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
