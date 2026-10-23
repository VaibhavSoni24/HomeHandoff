import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  User, 
  CheckCircle2, 
  Sparkles
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
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle,
      category: newCategory,
      assignee: newAssignee,
      priority: newPriority,
      dueDate: newDueDate ? new Date(newDueDate).toISOString() : new Date().toISOString(),
      completed: false,
      estimatedMinutes: Number(newEstMinutes) || 15
    });

    setShowAddModal(false);
    setNewTitle('');
  };

  return (
    <div className="module-container glass-panel">
      {/* Header Bar */}
      <div className="module-header">
        <div className="module-title-group">
          <div className="module-icon-wrap emerald">
            <CheckSquare size={20} />
          </div>
          <div>
            <h2 className="module-title">Household Chores & Plan Tasks</h2>
            <p className="module-subtitle">
              {activePlanTitle 
                ? `Synchronized with active plan: "${activePlanTitle}"` 
                : 'Intelligently coordinated household tasks and preparations'}
            </p>
          </div>
        </div>

        <div className="module-actions">
          {/* Status filters */}
          <div className="filter-pill-group">
            <button 
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({tasks.length})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'open' ? 'active' : ''}`}
              onClick={() => setFilterStatus('open')}
            >
              Open ({tasks.length - completedCount})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Done ({completedCount})
            </button>
          </div>

          <button className="primary-add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Progress & Assignee Filter Ribbon */}
      <div className="tasks-sub-ribbon">
        <div className="tasks-progress-indicator">
          <span className="progress-text">
            Overall Completion: <strong>{progressPercent}%</strong> ({completedCount}/{tasks.length})
          </span>
          <div className="ribbon-progress-track">
            <div className="ribbon-progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="assignee-filter-row">
          <span className="assignee-label">Assignee:</span>
          {['all', 'Vaibhav', 'Sarah', 'Shared'].map(person => (
            <button
              key={person}
              className={`person-filter-btn ${filterAssignee === person ? 'active' : ''}`}
              onClick={() => setFilterAssignee(person)}
            >
              {person === 'all' ? 'Everyone' : `👤 ${person}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="tasks-board-list">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => {
            return (
              <div 
                key={task.id} 
                className={`task-row-card ${task.completed ? 'task-completed-card' : ''} ${task.planId ? 'plan-linked-task' : ''}`}
              >
                <button 
                  className={`task-toggle-btn ${task.completed ? 'checked' : ''}`}
                  onClick={() => onToggleTask(task.id)}
                  title={task.completed ? 'Mark incomplete' : 'Mark completed'}
                >
                  {task.completed ? (
                    <CheckCircle2 size={20} className="check-icon-active" />
                  ) : (
                    <div className="check-box-empty"></div>
                  )}
                </button>

                <div className="task-main-details">
                  <div className="task-title-line">
                    <span className={`task-title-text ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </span>
                    {task.planId && (
                      <span className="badge badge-cyan" title="Auto-scheduled by Alexa+ Agent">
                        <Sparkles size={11} /> Plan Synced
                      </span>
                    )}
                  </div>

                  <div className="task-attributes-row">
                    <span className={`task-cat-badge cat-${task.category}`}>
                      {task.category.replace('_', ' ')}
                    </span>
                    <span className={`task-prio-badge ${task.priority}`}>
                      {task.priority} priority
                    </span>
                    <span className="task-assignee-tag">
                      <User size={12} /> {task.assignee}
                    </span>
                    <span className="task-due-tag">
                      <Clock size={12} /> Due: {formatDateTime(task.dueDate)}
                    </span>
                    <span className="task-est-time">
                      ~{task.estimatedMinutes} min
                    </span>
                  </div>

                  {task.notes && (
                    <p className="task-notes-text">💡 {task.notes}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-module-state">
            <CheckSquare size={36} className="text-muted" />
            <p>No tasks found for the selected filter.</p>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card glass-panel-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Household Chore / Task</h3>
            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label>Task Description</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Vacuum stairs, Pick up flowers"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assignee</label>
                  <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                    <option value="Vaibhav">Vaibhav</option>
                    <option value="Sarah">Sarah</option>
                    <option value="Shared">Shared</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as TaskCategory)}>
                    <option value="cleaning">Cleaning</option>
                    <option value="guest_room">Guest Room</option>
                    <option value="groceries">Groceries</option>
                    <option value="logistics">Logistics</option>
                    <option value="smart_home">Smart Home</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Est. Minutes</label>
                  <input 
                    type="number" 
                    min="5" 
                    max="180" 
                    value={newEstMinutes}
                    onChange={e => setNewEstMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
