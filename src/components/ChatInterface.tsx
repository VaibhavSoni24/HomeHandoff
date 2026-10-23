import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Volume2,
  Clock,
  CheckCircle2,
  Calendar,
  CheckSquare,
  ShoppingCart,
  Cpu,
  Info
} from 'lucide-react';
import type { HouseholdState, ToolCall } from '../types/household';

interface ChatInterfaceProps {
  state: HouseholdState;
  onSendMessage: (query: string) => void;
  onSelectTab: (tabId: string) => void;
  isProcessing: boolean;
  isSpeaking: boolean;
  onSpeakMessage?: (text: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  state,
  onSendMessage,
  onSelectTab,
  isProcessing,
  onSpeakMessage
}) => {
  const [input, setInput] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const toggleToolExpand = (toolId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  const scenarioPrompts = [
    {
      id: 'sc1',
      number: '1',
      title: 'Initial Multi-Step Plan',
      prompt: 'My parents are visiting Friday. Prepare the house.',
      desc: 'Blocks calendar, assigns 5 chores to Sarah & Vaibhav, adds 5 grocery items, and schedules arrival routine.'
    },
    {
      id: 'sc2',
      number: '2',
      title: 'Reschedule to Saturday',
      prompt: "Actually, they're arriving Saturday at 5 PM.",
      desc: 'Shifts visit date, preserves pre-arrival chore buffers, and updates routine trigger to Saturday 3:30 PM.'
    },
    {
      id: 'sc3',
      number: '3',
      title: 'Readiness Inspection',
      prompt: 'What still needs doing before they arrive?',
      desc: 'Evaluates live completion state and reports open tasks with dynamic preparation readiness score.'
    }
  ];

  const getToolIcon = (name: string) => {
    if (name.startsWith('calendar')) return <Calendar size={13} />;
    if (name.startsWith('tasks')) return <CheckSquare size={13} />;
    if (name.startsWith('shopping')) return <ShoppingCart size={13} />;
    if (name.startsWith('routines')) return <Cpu size={13} />;
    return <Sparkles size={13} />;
  };

  return (
    <div className="chat-workflow-container">
      {/* Assistant Overview & Guided Scenarios Bar */}
      <section className="assistant-hero-card surface-card">
        <div className="assistant-hero-header">
          <div className="assistant-hero-titles">
            <h2 className="assistant-title">Household Coordination Assistant</h2>
            <p className="assistant-subtitle">
              Natural language instructions are decomposed into coordinated calendar updates, chore assignments, grocery lists, and smart-home routines.
            </p>
          </div>
          <div className="assistant-status-tag" role="status" aria-live="polite">
            <span className={`status-dot ${isProcessing ? 'status-dot-active' : ''}`} />
            <span>{isProcessing ? 'Processing request...' : 'Ready'}</span>
          </div>
        </div>

        {/* 3 Clearly Presented Suggested Scenarios */}
        <div className="scenarios-panel">
          <div className="scenarios-panel-heading">
            <span>Demo Scenarios:</span>
            <span className="scenarios-hint">Click any scenario to run its autonomous coordination workflow</span>
          </div>
          <div className="scenarios-grid">
            {scenarioPrompts.map(sc => (
              <button
                key={sc.id}
                type="button"
                className="scenario-card-btn"
                onClick={() => onSendMessage(sc.prompt)}
                disabled={isProcessing}
              >
                <div className="scenario-card-top">
                  <span className="scenario-badge">Scenario {sc.number}</span>
                  <span className="scenario-name">{sc.title}</span>
                </div>
                <div className="scenario-prompt-quote">"{sc.prompt}"</div>
                <div className="scenario-card-desc">{sc.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Message Stream */}
      <section className="chat-messages-container surface-card" aria-label="Conversation with Household Assistant">
        <div className="messages-stream">
          {state.chatHistory.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';
            return (
              <div 
                key={msg.id || index} 
                className={`message-row ${isUser ? 'user-row' : isSystem ? 'system-row' : 'assistant-row'}`}
              >
                <div className="message-bubble-wrapper">
                  <div className="message-meta-header">
                    <span className="message-sender-name">
                      {isUser ? 'You' : isSystem ? 'System Notice' : 'Household Assistant'}
                    </span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {!isUser && !isSystem && onSpeakMessage && (
                      <button 
                        type="button"
                        className="inline-action-btn" 
                        onClick={() => onSpeakMessage(msg.text)}
                        title="Read message aloud"
                        aria-label="Read message aloud"
                      >
                        <Volume2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className={`message-bubble ${isUser ? 'bubble-user' : isSystem ? 'bubble-system' : 'bubble-assistant'}`}>
                    <div className="message-text-content">
                      {msg.text.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx} className="message-paragraph">
                          {paragraph.split('\n').map((line, lIdx) => (
                            <React.Fragment key={lIdx}>
                              {line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('•') || line.startsWith('-') ? (
                                <span className="message-list-item">{line}</span>
                              ) : (
                                line
                              )}
                              {lIdx < paragraph.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </p>
                      ))}
                    </div>

                    {/* Active Plan Summary Card if present */}
                    {msg.planSummary && (
                      <div className="plan-summary-card">
                        <div className="plan-summary-header">
                          <span className="summary-title">{msg.planSummary.planTitle}</span>
                          <span className="summary-readiness-badge">
                            {msg.planSummary.readinessScore}% Complete
                          </span>
                        </div>
                        <div className="summary-progress-track">
                          <div 
                            className="summary-progress-fill" 
                            style={{ width: `${msg.planSummary.readinessScore}%` }} 
                          />
                        </div>
                        <div className="plan-summary-meta">
                          <span>Target: <strong>{msg.planSummary.targetDateFormatted}</strong></span>
                          <span>Tasks: <strong>{msg.planSummary.completedTasks} of {msg.planSummary.totalTasks} completed</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Executed Tools Details (Collapsible Audit Section) */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="message-tools-section">
                        <div className="tools-section-label">
                          <Info size={12} />
                          <span>Simulated Tool Executions ({msg.toolCalls.length}):</span>
                        </div>
                        <div className="tools-list">
                          {msg.toolCalls.map((tool: ToolCall) => {
                            const isExpanded = !!expandedTools[tool.id];
                            return (
                              <div key={tool.id} className="tool-execution-card">
                                <button
                                  type="button"
                                  className="tool-card-toggle"
                                  onClick={() => toggleToolExpand(tool.id)}
                                  aria-expanded={isExpanded}
                                >
                                  <div className="tool-toggle-left">
                                    <span className="tool-type-icon">{getToolIcon(tool.toolName)}</span>
                                    <span className="tool-name-code">{tool.toolName}</span>
                                    <span className="tool-status-pill success">
                                      <CheckCircle2 size={11} />
                                      {tool.status}
                                    </span>
                                  </div>
                                  <div className="tool-toggle-right">
                                    <span className="tool-sim-time">
                                      <Clock size={11} /> {tool.executionTimeMs}ms (sim)
                                    </span>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </div>
                                </button>
                                
                                {isExpanded && (
                                  <div className="tool-details-body">
                                    <p className="tool-desc-text">{tool.description}</p>
                                    <div className="tool-json-grid">
                                      <div className="json-box">
                                        <div className="json-label">Input Parameters</div>
                                        <pre>{JSON.stringify(tool.input, null, 2)}</pre>
                                      </div>
                                      <div className="json-box">
                                        <div className="json-label">State Mutation Result</div>
                                        <pre>{JSON.stringify(tool.output, null, 2)}</pre>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-up Actions */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="suggested-actions-row">
                        {msg.suggestedActions.map((action, aIdx) => {
                          const isTabSwitch = action.startsWith('View ');
                          return (
                            <button
                              key={aIdx}
                              type="button"
                              className="suggestion-btn"
                              onClick={() => {
                                if (isTabSwitch) {
                                  const lower = action.toLowerCase();
                                  if (lower.includes('task') || lower.includes('chore')) onSelectTab('tasks');
                                  else if (lower.includes('shop')) onSelectTab('shopping');
                                  else if (lower.includes('calen')) onSelectTab('calendar');
                                  else if (lower.includes('routine')) onSelectTab('routines');
                                  else onSelectTab('dashboard');
                                } else {
                                  onSendMessage(action);
                                }
                              }}
                              disabled={isProcessing}
                            >
                              {action}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="message-row assistant-row">
              <div className="message-bubble-wrapper">
                <div className="message-bubble bubble-assistant processing-bubble">
                  <div className="typing-indicator" aria-label="Executing plan tools...">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span className="processing-label">Analyzing household state and executing tool pipeline...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Form */}
        <form onSubmit={handleSubmit} className="chat-composer-form">
          <div className="composer-input-wrapper">
            <input
              type="text"
              className="chat-input-field"
              placeholder="Give a household coordination instruction (e.g., 'My parents are visiting Friday...')"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isProcessing}
              aria-label="Household coordination instruction"
            />
            <button 
              type="submit" 
              className="btn-send-message" 
              disabled={!input.trim() || isProcessing}
              aria-label="Send instruction"
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
          <div className="composer-hint-row">
            <span>Try natural variations like <em>"Mom and dad are coming this Friday, get the house ready"</em></span>
          </div>
        </form>
      </section>
    </div>
  );
};
