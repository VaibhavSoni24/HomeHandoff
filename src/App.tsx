import React, { useState, useEffect } from 'react';
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

import type { HouseholdState, CalendarEvent, Task, ShoppingItem } from './types/household';
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

  // Handle conversational query
  const handleSendMessage = (query: string) => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);

    // Simulate subtle realistic processing latency for asynchronous tool orchestration
    setTimeout(() => {
      try {
        const result = processUserMessage(query, state);
        setState(result.nextState);

        // Voice output if enabled
        if (result.nextState.settings.voiceFeedback) {
          setIsSpeaking(true);
          speakText(result.responseMessage.text, () => {
            setIsSpeaking(false);
          });
        }
      } catch (err) {
        console.error('Agent execution error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 450);
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

  // Direct state mutations
  const handleToggleTask = (taskId: string) => {
    setState(prev => toggleTaskInState(prev, taskId));
  };

  const handleToggleShopping = (itemId: string) => {
    setState(prev => toggleShoppingItemInState(prev, itemId));
  };

  const handleToggleRoutine = (routineId: string) => {
    setState(prev => toggleRoutineInState(prev, routineId));
  };

  // Direct manual additions
  const handleAddCalendarEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `evt-custom-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      events: [newEvent, ...prev.events]
    }));
  };

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-custom-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks]
    }));
  };

  const handleAddShoppingItem = (itemData: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = {
      ...itemData,
      id: `shop-custom-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      shoppingItems: [newItem, ...prev.shoppingItems]
    }));
  };

  // Counts for tab badges
  const pendingTasksCount = state.tasks.filter(t => !t.completed).length;
  const pendingShoppingCount = state.shoppingItems.filter(s => !s.completed).length;
  const activePlanTitle = state.activePlan?.title;

  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <Header
        state={state}
        onResetDemo={handleResetDemo}
        onToggleVoice={handleToggleVoice}
        onOpenDisclosure={() => setShowDisclosure(true)}
        isSpeaking={isSpeaking}
      />

      {/* Main Tab Navigation */}
      <nav className="nav-tabs-bar">
        <button
          className={`nav-tab-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Alexa+ Agent</span>
          <span className="tab-badge">Live</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={16} />
          <span>Calendar</span>
          <span className="tab-badge">{state.events.length}</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={16} />
          <span>Chores & Tasks</span>
          {pendingTasksCount > 0 && <span className="tab-badge">{pendingTasksCount}</span>}
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'shopping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shopping')}
        >
          <ShoppingCart size={16} />
          <span>Shopping List</span>
          {pendingShoppingCount > 0 && <span className="tab-badge">{pendingShoppingCount}</span>}
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'routines' ? 'active' : ''}`}
          onClick={() => setActiveTab('routines')}
        >
          <Cpu size={16} />
          <span>Smart Routines</span>
          <span className="tab-badge">{state.routines.filter(r => r.enabled).length}</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'trace' ? 'active' : ''}`}
          onClick={() => setActiveTab('trace')}
        >
          <Sparkles size={16} />
          <span>Execution Trace</span>
          <span className="tab-badge">{state.toolHistory.length}</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content-panel">
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

      {/* Footer */}
      <footer className="app-footer glass-panel">
        <div className="footer-left">
          <span>HomeHandoff · Context-Aware Household Coordination</span>
          <span>•</span>
          <span>Amazon Developer Hackathon — Alexa+ Track</span>
        </div>
        <div className="footer-right">
          <button className="footer-link-btn" onClick={() => setShowDisclosure(true)}>
            Simulated Integrations Disclosure
          </button>
          <span>•</span>
          <button className="footer-link-btn" onClick={handleResetDemo}>
            Reset Demo Data
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
