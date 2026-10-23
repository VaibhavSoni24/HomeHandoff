import React, { useState } from 'react';
import { 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Search, 
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import type { ToolCall } from '../types/household';

interface ExecutionTraceProps {
  toolHistory: ToolCall[];
}

export const ExecutionTrace: React.FC<ExecutionTraceProps> = ({ toolHistory }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToolFilter, setSelectedToolFilter] = useState('all');
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  const filteredHistory = toolHistory.filter(tool => {
    if (selectedToolFilter !== 'all' && !tool.toolName.startsWith(selectedToolFilter)) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        tool.toolName.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        JSON.stringify(tool.input).toLowerCase().includes(q) ||
        JSON.stringify(tool.output).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleExpand = (toolId: string) => {
    setExpandedPayloads(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  const handleCopy = async (tool: ToolCall) => {
    setCopyError(null);
    const data = {
      toolName: tool.toolName,
      timestamp: tool.timestamp,
      executionTimeMs: tool.executionTimeMs,
      status: tool.status,
      input: tool.input,
      output: tool.output
    };
    const jsonString = JSON.stringify(data, null, 2);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        // Fallback for non-secure contexts or unsupported clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        try {
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textarea);
        }
      }
      setCopiedId(tool.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
      setCopyError('Could not copy to clipboard. Please inspect the parameters below directly.');
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  const totalCalls = toolHistory.length;
  const avgDuration = totalCalls > 0 
    ? Math.round(toolHistory.reduce((acc, t) => acc + t.executionTimeMs, 0) / totalCalls) 
    : 0;
  const successCount = toolHistory.filter(t => t.status === 'success').length;
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0;

  return (
    <div className="module-panel surface-card">
      {/* Header Bar */}
      <div className="module-header-row">
        <div>
          <h2 className="module-heading">Autonomous Tool Execution Audit Trail</h2>
          <p className="module-subheading">
            Live technical trace of simulated Alexa+ agent tool invocations mutating application state
          </p>
        </div>

        <div className="trace-stats-summary">
          <div className="trace-stat-box">
            <span className="stat-value">{totalCalls}</span>
            <span className="stat-desc">Tools Dispatched</span>
          </div>
          <div className="trace-stat-box" title="Simulated execution latency">
            <span className="stat-value">{avgDuration}ms</span>
            <span className="stat-desc">Avg. Sim. Latency</span>
          </div>
          <div className="trace-stat-box">
            <span className={`stat-value ${totalCalls > 0 ? 'text-emerald' : 'text-muted'}`}>
              {totalCalls > 0 ? `${successRate}%` : '—'}
            </span>
            <span className="stat-desc">
              {totalCalls > 0 ? `State Success (${successCount}/${totalCalls})` : 'No executions yet'}
            </span>
          </div>
        </div>
      </div>

      {copyError && (
        <div className="form-error-banner" role="alert">
          <AlertCircle size={15} />
          <span>{copyError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="trace-controls-bar">
        <div className="trace-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="trace-search-input"
            placeholder="Search tool names, parameters, or payloads..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search tool executions"
          />
        </div>

        <div className="filter-button-group">
          {['all', 'calendar', 'tasks', 'shopping', 'routines', 'agent'].map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn-filter ${selectedToolFilter === cat ? 'active' : ''}`}
              onClick={() => setSelectedToolFilter(cat)}
            >
              {cat === 'all' ? 'All Tools' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Call Cards */}
      <div className="trace-stream-list">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((tool, idx) => {
            const isCopied = copiedId === tool.id;
            const isExpanded = !!expandedPayloads[tool.id];
            const stepNumber = totalCalls - idx;

            return (
              <div key={tool.id} className="trace-entry-card surface-card">
                <div className="trace-entry-header">
                  <div className="trace-entry-left">
                    <span className="step-tag">Step #{stepNumber}</span>
                    <span className="tool-code-tag">{tool.toolName}</span>
                    <span className={`status-pill ${tool.status}`}>
                      {tool.status === 'success' && <CheckCircle2 size={12} />}
                      {tool.status === 'failed' && <AlertCircle size={12} />}
                      {tool.status === 'executing' && <Clock size={12} />}
                      {tool.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="trace-entry-right">
                    <span className="trace-sim-time" title="Explicitly labeled simulated latency">
                      <Clock size={12} />
                      {tool.executionTimeMs}ms (simulated)
                    </span>

                    <button
                      type="button"
                      className="btn-icon-subtle"
                      onClick={() => handleCopy(tool)}
                      title="Copy tool execution payload as JSON"
                      aria-label="Copy tool execution JSON"
                    >
                      {isCopied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-icon-subtle"
                      onClick={() => toggleExpand(tool.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                <p className="trace-description">{tool.description}</p>

                {isExpanded && (
                  <div className="trace-payload-details">
                    <div className="payload-grid">
                      <div className="payload-col">
                        <span className="payload-title">Input Parameters</span>
                        <pre className="payload-pre">{JSON.stringify(tool.input, null, 2)}</pre>
                      </div>
                      <div className="payload-col">
                        <span className="payload-title">State Mutation Result</span>
                        <pre className="payload-pre">{JSON.stringify(tool.output, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state-card">
            <Cpu size={24} className="text-muted" />
            <p>No tool executions found matching the current search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
