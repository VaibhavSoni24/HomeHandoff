import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Layers, 
  Cpu, 
  ChevronDown, 
  ChevronUp,
  Volume2,
  Clock
} from 'lucide-react';
import type { HouseholdState } from '../types/household';

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
  isSpeaking,
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
      tag: 'Scenario 1',
      title: 'Prepare for Parents',
      prompt: 'My parents are visiting Friday. Prepare the house.',
      desc: 'Generates coordinated plan, calendar block, tasks, shopping & routine'
    },
    {
      id: 'sc2',
      tag: 'Scenario 2',
      title: 'Reschedule to Saturday',
      prompt: "Actually, they're arriving Saturday at 5 PM.",
      desc: 'Shifts visit, preserves prep buffers & adjusts smart routine trigger'
    },
    {
      id: 'sc3',
      tag: 'Scenario 3',
      title: 'Check Remaining Prep',
      prompt: 'What still needs doing before they arrive?',
      desc: 'Inspects state, summaries open chores & readiness score'
    }
  ];

  return (
    <div className="chat-container glass-panel">
      {/* Alexa+ Ambient Sphere Banner */}
      <div className="alexa-sphere-header">
        <div className="sphere-left">
          <div className={`alexa-pulse-sphere ${isSpeaking ? 'speaking-active' : ''} ${isProcessing ? 'thinking-active' : ''}`}>
            <div className="sphere-inner-core"></div>
            <div className="sphere-glow-ring"></div>
          </div>
          <div className="sphere-info">
            <div className="sphere-title-row">
              <h3>Alexa+ Household Orchestrator</h3>
              <span className="live-status-pill">
                <span className="live-indicator-dot"></span>
                {isProcessing ? 'Executing Multi-Step Plan...' : isSpeaking ? 'Speaking Response...' : 'Listening & Ready'}
              </span>
            </div>
            <p className="sphere-sub">Autonomous multi-module task decomposition and state synchronizer</p>
          </div>
        </div>

        {/* Audio Soundwave Equalizer */}
        <div className={`soundwave-equalizer ${isSpeaking || isProcessing ? 'animating' : ''}`}>
          <span className="wave-bar"></span>
          <span className="wave-bar"></span>
          <span className="wave-bar"></span>
          <span className="wave-bar"></span>
          <span className="wave-bar"></span>
        </div>
      </div>

      {/* Guided Scenario Launch Bar */}
      <div className="scenario-prompts-bar">
        <div className="scenario-bar-title">
          <Sparkles size={14} className="text-cyan" />
          <span>Interactive Hackathon Scenarios:</span>
        </div>
        <div className="scenario-pills-row">
          {scenarioPrompts.map(sc => (
            <button
              key={sc.id}
              className="scenario-pill-btn"
              onClick={() => onSendMessage(sc.prompt)}
              disabled={isProcessing}
              title={sc.desc}
            >
              <span className="pill-tag">{sc.tag}</span>
              <span className="pill-title">{sc.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="messages-stream">
        {state.chatHistory.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';
          return (
            <div 
              key={msg.id || index} 
              className={`message-row ${isUser ? 'user-row' : isSystem ? 'system-row' : 'assistant-row'} animate-fade-in`}
            >
              <div className="message-bubble-wrapper">
                <div className="message-header-meta">
                  <span className="message-sender-name">
                    {isUser ? 'Vaibhav Soni (User)' : isSystem ? 'System Notice' : 'HomeHandoff (Alexa+ Agent)'}
                  </span>
                  <span className="message-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isUser && !isSystem && onSpeakMessage && (
                    <button 
                      className="inline-speak-btn" 
                      onClick={() => onSpeakMessage(msg.text)}
                      title="Read aloud"
                    >
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>

                <div className={`message-bubble ${isUser ? 'user-bubble' : isSystem ? 'system-bubble' : 'assistant-bubble'}`}>
                  {/* Formatted Text */}
                  <div className="bubble-text-content">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx} className="message-paragraph">
                        {renderFormattedText(paragraph)}
                      </p>
                    ))}
                  </div>

                  {/* Plan Summary Card (if present) */}
                  {msg.planSummary && (
                    <div className="message-plan-card">
                      <div className="plan-card-header">
                        <div className="plan-title-group">
                          <Layers size={16} className="text-cyan" />
                          <span className="plan-card-title">{msg.planSummary.planTitle}</span>
                        </div>
                        <span className="plan-card-score badge badge-emerald">
                          {msg.planSummary.readinessScore}% Ready
                        </span>
                      </div>
                      
                      <div className="plan-progress-track">
                        <div 
                          className="plan-progress-fill" 
                          style={{ width: `${msg.planSummary.readinessScore}%` }}
                        ></div>
                      </div>

                      <div className="plan-card-footer">
                        <span>Target: <strong>{msg.planSummary.targetDateFormatted}</strong></span>
                        <span>Tasks: <strong>{msg.planSummary.completedTasks} / {msg.planSummary.totalTasks} Done</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Executed Tools Trace Preview */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="message-tool-calls-container">
                      <div className="tool-calls-label">
                        <Cpu size={14} className="text-cyan" />
                        <span>Autonomous Tool Invocations ({msg.toolCalls.length}):</span>
                      </div>
                      <div className="tool-cards-list">
                        {msg.toolCalls.map(tool => {
                          const isExpanded = !!expandedTools[tool.id];
                          return (
                            <div key={tool.id} className="tool-call-card">
                              <div 
                                className="tool-card-summary"
                                onClick={() => toggleToolExpand(tool.id)}
                              >
                                <div className="tool-summary-left">
                                  <span className="tool-status-dot"></span>
                                  <span className="tool-name-code">{tool.toolName}</span>
                                  <span className="tool-desc-text">{tool.description}</span>
                                </div>
                                <div className="tool-summary-right">
                                  <span className="tool-duration" title="Client-side simulated latency">
                                    <Clock size={11} />
                                    {tool.executionTimeMs}ms (sim)
                                  </span>
                                  <button className="tool-chevron-btn" aria-label="Toggle details">
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="tool-payload-inspector">
                                  <div className="payload-column">
                                    <span className="payload-col-title">Input Parameters:</span>
                                    <pre className="json-block">{JSON.stringify(tool.input, null, 2)}</pre>
                                  </div>
                                  <div className="payload-column">
                                    <span className="payload-col-title">Output & State Mutation:</span>
                                    <pre className="json-block">{JSON.stringify(tool.output, null, 2)}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions Chips */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="suggested-actions-row">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          className="suggested-action-chip"
                          onClick={() => onSendMessage(action)}
                          disabled={isProcessing}
                        >
                          <span>{action}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="message-row assistant-row animate-fade-in">
            <div className="message-bubble-wrapper">
              <div className="message-bubble assistant-bubble thinking-bubble">
                <div className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="thinking-text">Decomposing intent, calculating timelines & executing tools...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-bar-wrapper">
          <input
            type="text"
            className="chat-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a request (e.g. 'My parents are visiting Friday. Prepare the house.')..."
            disabled={isProcessing}
          />

          <button
            type="button"
            className="input-tool-btn"
            onClick={() => onSelectTab('trace')}
            title="Inspect Full Execution Trace"
          >
            <Cpu size={17} />
          </button>

          <button
            type="submit"
            className="input-submit-btn"
            disabled={!input.trim() || isProcessing}
            title="Send request to HomeHandoff"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

// Simple Markdown parser for bolding, bullet points, and checkmarks
function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    // Checkbox items
    if (line.startsWith('- [ ] ')) {
      return (
        <div key={idx} className="md-checklist-item">
          <span className="md-checkbox"></span>
          <span>{renderInlineMarkdown(line.slice(6))}</span>
        </div>
      );
    }

    // Bullet points
    if (line.startsWith('- ')) {
      return (
        <div key={idx} className="md-bullet-item">
          <span className="md-bullet-dot">•</span>
          <span>{renderInlineMarkdown(line.slice(2))}</span>
        </div>
      );
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="md-numbered-item">
          <span className="md-number-pill">{numMatch[1]}</span>
          <span>{renderInlineMarkdown(numMatch[2])}</span>
        </div>
      );
    }

    // Headings
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="md-h4">{renderInlineMarkdown(line.slice(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="md-h3">{renderInlineMarkdown(line.slice(3))}</h3>;
    }

    return (
      <span key={idx} className="md-normal-line">
        {renderInlineMarkdown(line)}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}

function renderInlineMarkdown(str: string): React.ReactNode {
  // Bold **text**
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Italics *text*
    const subParts = part.split(/(\*.*?\*)/g);
    return subParts.map((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*')) {
        return <em key={j}>{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  });
}
