import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ShoppingCart, 
  Cpu, 
  Sparkles
} from 'lucide-react';

import type { HouseholdState, CalendarEvent, Task, ShoppingItem, ToolCall } from './types/household';
import { loadStateFromStorage, saveStateToStorage, resetDemoState } from './services/storage';
import { 
  processUserMessage, 
  toggleTaskInState, 
  toggleShoppingItemInState, 
  toggleRoutineInState 
} from './services/agentEngine';
import { speakText, stopSpeaking } from './services/speech';

import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { CalendarModule } from './components/CalendarModule';
import { TasksModule } from './components/TasksModule';
import { ShoppingModule } from './components/ShoppingModule';
import { RoutinesModule } from './components/RoutinesModule';
import { ExecutionTrace } from './components/ExecutionTrace';
import { DisclosuresModal } from './components/DisclosuresModal';

export const App: React.FC = () => {
  const [state, setState] = useState<HouseholdState>(() => loadStateFromStorage());
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  // Auto-persist state changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle conversational query with state race protection and error recovery
  const handleSendMessage = (query: string) => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);

    // Simulate realistic processing latency for asynchronous tool orchestration
    setTimeout(() => {
      try {
        const currentState = stateRef.current;
        const result = processUserMessage(query, currentState);
        setState(() => result.nextState);

        // Voice output if enabled
        if (result.nextState.settings.voiceFeedback) {
          setIsSpeaking(true);
          speakText(result.responseMessage.text, () => {
            setIsSpeaking(false);
          });
        }
      } catch (err: unknown) {
        console.error('Agent execution error:', err);
        const errorMessageText = err instanceof Error ? err.message : 'Unexpected processing error';
        const errorMsg = {
          id: `msg-err-${Date.now()}`,
          sender: 'system' as const,
          text: `Action Failed: Could not process household coordination request (${errorMessageText}). Please try again or tap "Reset Demo".`,
          timestamp: new Date().toISOString()
        };
        setState(prev => ({
          ...prev,
          chatHistory: [...prev.chatHistory, errorMsg]
        }));
      } finally {
        setIsProcessing(false);
      }
    }, 280);
  };

  // Toggle voice output setting
  const handleToggleVoice = () => {
    setState(prev => {
      const nextVoice = !prev.settings.voiceFeedback;
      if (!nextVoice) {
        stopSpeaking();
        setIsSpeaking(false);
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          voiceFeedback: nextVoice
        }
      };
    });
  };

  // Speak explicit message aloud
  const handleSpeakMessage = (text: string) => {
    setIsSpeaking(true);
    speakText(text, () => setIsSpeaking(false));
  };

  // Reset to initial seed state
  const handleResetDemo = () => {
    stopSpeaking();
    setIsSpeaking(false);
    const fresh = resetDemoState();
    setState(fresh);
    setActiveTab('chat');
  };

  // Direct state mutations with consistent tool tracking
  const handleToggleTask = (taskId: string) => {
    setState(prev => toggleTaskInState(prev, taskId));
  };

  const handleToggleShopping = (itemId: string) => {
    setState(prev => toggleShoppingItemInState(prev, itemId));
  };

  const handleToggleRoutine = (routineId: string) => {
    setState(prev => toggleRoutineInState(prev, routineId));
  };

  // Manual event addition with consistent tool call logging
  const handleAddCalendarEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `evt-custom-${Date.now()}`
    };
    const manualToolCall: ToolCall = {
      id: `tool-${Date.now()}-cal`,
      timestamp: new Date().toISOString(),
      toolName: 'calendar.createEvent',
      description: `Manually scheduled calendar event: "${newEvent.title}"`,
      input: { title: newEvent.title, start: newEvent.start, end: newEvent.end, location: newEvent.location },
      output: { eventId: newEvent.id, status: 'created', source: 'manual_ui' },
      status: 'success',
      executionTimeMs: 18
    };

    setState(prev => ({
      ...prev,
      events: [newEvent, ...prev.events],
      toolHistory: [manualToolCall, ...prev.toolHistory]
    }));
  };

  // Manual chore addition with consistent tool call logging
  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-custom-${Date.now()}`
    };
    const manualToolCall: ToolCall = {
      id: `tool-${Date.now()}-task`,
      timestamp: new Date().toISOString(),
      toolName: 'tasks.batchCreate',
      description: `Manually added task: "${newTask.title}" (assigned to ${newTask.assignee})`,
      input: { title: newTask.title, assignee: newTask.assignee, priority: newTask.priority },
      output: { taskId: newTask.id, status: 'created', source: 'manual_ui' },
      status: 'success',
      executionTimeMs: 14
    };

    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      toolHistory: [manualToolCall, ...prev.toolHistory]
    }));
  };

  // Manual shopping item addition with consistent tool call logging
  const handleAddShoppingItem = (itemData: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = {
      ...itemData,
      id: `shop-custom-${Date.now()}`
    };
    const manualToolCall: ToolCall = {
      id: `tool-${Date.now()}-shop`,
      timestamp: new Date().toISOString(),
      toolName: 'shopping.addItems',
      description: `Manually added shopping item: "${newItem.name}" (${newItem.quantity})`,
      input: { name: newItem.name, quantity: newItem.quantity, category: newItem.category },
      output: { itemId: newItem.id, status: 'created', source: 'manual_ui' },
      status: 'success',
      executionTimeMs: 12
    };

    setState(prev => ({
      ...prev,
      shoppingItems: [newItem, ...prev.shoppingItems],
      toolHistory: [manualToolCall, ...prev.toolHistory]
    }));
  };

  // Counts for tab badges
  const pendingTasksCount = state.tasks.filter(t => !t.completed).length;
  const pendingShoppingCount = state.shoppingItems.filter(s => !s.completed).length;
  const activePlanTitle = state.activePlan?.title;

  const tabsConfig = [
    { id: 'chat', label: 'Assistant', icon: MessageSquare, badge: null },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, badge: state.events.length },
    { id: 'tasks', label: 'Chores & Tasks', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'shopping', label: 'Shopping List', icon: ShoppingCart, badge: pendingShoppingCount > 0 ? pendingShoppingCount : null },
    { id: 'routines', label: 'Smart Routines', icon: Cpu, badge: state.routines.filter(r => r.enabled).length },
    { id: 'trace', label: 'Audit Trail', icon: Sparkles, badge: state.toolHistory.length }
  ];

  return (
    <div className="app-shell">
      {/* Top Header */}
      <Header
        state={state}
        onResetDemo={handleResetDemo}
        onToggleVoice={handleToggleVoice}
        onOpenDisclosure={() => setShowDisclosure(true)}
        isSpeaking={isSpeaking}
      />

      {/* Main Navigation Tabs */}
      <div className="nav-container">
        {/* Mobile Dropdown Selector for small viewports */}
        <div className="mobile-nav-selector">
          <label htmlFor="mobile-tab-select" className="mobile-nav-label">Navigate to:</label>
          <select 
            id="mobile-tab-select"
            className="mobile-select-dropdown"
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
          >
            {tabsConfig.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label} {tab.badge ? `(${tab.badge})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop / Tablet Segmented Tab Bar */}
        <nav className="primary-tabs-nav" aria-label="Main Navigation">
          {tabsConfig.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`tab-nav-btn ${isActive ? 'tab-nav-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={isActive}
                role="tab"
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className={`tab-count-badge ${isActive ? 'badge-active' : ''}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="main-viewport" role="tabpanel">
        {activeTab === 'chat' && (
          <ChatInterface
            state={state}
            onSendMessage={handleSendMessage}
            onSelectTab={setActiveTab}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            onSpeakMessage={handleSpeakMessage}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            state={state}
            onSelectTab={setActiveTab}
            onToggleTask={handleToggleTask}
            onTriggerScenario={query => {
              handleSendMessage(query);
              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarModule
            events={state.events}
            onAddEvent={handleAddCalendarEvent}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksModule
            tasks={state.tasks}
            activePlanTitle={activePlanTitle}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingModule
            items={state.shoppingItems}
            activePlanTitle={activePlanTitle}
            onToggleItem={handleToggleShopping}
            onAddItem={handleAddShoppingItem}
          />
        )}

        {activeTab === 'routines' && (
          <RoutinesModule
            routines={state.routines}
            onToggleRoutine={handleToggleRoutine}
          />
        )}

        {activeTab === 'trace' && (
          <ExecutionTrace
            toolHistory={state.toolHistory}
          />
        )}
      </main>

      {/* Clean Restrained Footer */}
      <footer className="app-footer-bar">
        <div className="footer-meta-left">
          <span>HomeHandoff · Autonomous Household Coordination</span>
          <span className="footer-dot">•</span>
          <span>Amazon Developer Hackathon (Alexa+ Track)</span>
        </div>
        <div className="footer-links-right">
          <button 
            type="button" 
            className="footer-btn-link" 
            onClick={() => setShowDisclosure(true)}
          >
            Simulated Integrations Disclosure
          </button>
          <span className="footer-dot">•</span>
          <button 
            type="button" 
            className="footer-btn-link" 
            onClick={handleResetDemo}
          >
            Reset Demo
          </button>
        </div>
      </footer>

      {/* Honest Disclosure Modal */}
      <DisclosuresModal
        isOpen={showDisclosure}
        onClose={() => setShowDisclosure(false)}
      />
    </div>
  );
};

export default App;
