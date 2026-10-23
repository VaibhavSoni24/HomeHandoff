import React, { useState } from 'react';
import { 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code2, 
  Search, 
  Database
} from 'lucide-react';
import type { ToolCall } from '../types/household';

interface ExecutionTraceProps {
  toolHistory: ToolCall[];
}

export const ExecutionTrace: React.FC<ExecutionTraceProps> = ({ toolHistory }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToolFilter, setSelectedToolFilter] = useState('all');

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

  const handleCopy = (tool: ToolCall) => {
    const data = {
      toolName: tool.toolName,
      timestamp: tool.timestamp,
      executionTimeMs: tool.executionTimeMs,
      status: tool.status,
      input: tool.input,
      output: tool.output
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(tool.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalCalls = toolHistory.length;
  const avgDuration = totalCalls > 0 
    ? Math.round(toolHistory.reduce((acc, t) => acc + t.executionTimeMs, 0) / totalCalls) 
    : 0;
  const successCount = toolHistory.filter(t => t.status === 'success').length;
  const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100;

  return (
    <div className="module-container glass-panel">
      {/* Header Bar */}
      <div className="module-header">
        <div className="module-title-group">
          <div className="module-icon-wrap cyan">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="module-title">Autonomous Tool Execution Trace</h2>
            <p className="module-subtitle">
              Live audit stream of simulated Alexa+ agent tool invocations mutating application state
            </p>
          </div>
        </div>

        <div className="trace-stats-summary">
          <div className="stat-pill">
            <span className="stat-num">{totalCalls}</span>
            <span className="stat-label">Calls Executed</span>
          </div>
          <div className="stat-pill" title="Simulated client execution latency">
            <span className="stat-num">{avgDuration}ms</span>
            <span className="stat-label">Avg. Sim. Latency</span>
          </div>
          <div className={`stat-pill ${successRate === 100 ? 'emerald' : 'amber'}`}>
            <span className="stat-num">{successRate}%</span>
            <span className="stat-label">State Success ({successCount}/{totalCalls})</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="trace-filter-bar">
        <div className="search-box-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="trace-search-input"
            placeholder="Search tool names, parameters, or payloads..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="trace-categories-row">
          {['all', 'calendar', 'tasks', 'shopping', 'routines', 'agent'].map(cat => (
            <button
              key={cat}
              className={`filter-btn ${selectedToolFilter === cat ? 'active' : ''}`}
              onClick={() => setSelectedToolFilter(cat)}
            >
              {cat === 'all' ? 'All Tools' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Call Cards */}
      <div className="trace-cards-stream">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((tool, idx) => {
            const isCopied = copiedId === tool.id;
            const stepNumber = totalCalls - idx;

            return (
              <div key={tool.id} className="trace-card glass-panel-elevated animate-fade-in">
                <div className="trace-card-header">
                  <div className="trace-header-left">
                    <span className="step-badge">Step #{stepNumber}</span>
                    <span className="tool-signature-tag">{tool.toolName}</span>
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> {tool.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="trace-header-right">
                    <span className="trace-time-badge" title="Simulated execution latency">
                      <Clock size={12} /> {tool.executionTimeMs}ms (simulated)
                    </span>
                    <span className="trace-timestamp-text">
                      {new Date(tool.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <button 
                      className="copy-payload-btn"
                      onClick={() => handleCopy(tool)}
                      title="Copy full tool call JSON"
                    >
                      {isCopied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                </div>

                <div className="trace-description-bar">
                  <span className="trace-desc-label">Action:</span>
                  <p className="trace-desc-text">{tool.description}</p>
                </div>

                {/* Side-by-side JSON payload viewer */}
                <div className="trace-payload-grid">
                  <div className="payload-panel">
                    <div className="panel-header">
                      <Code2 size={13} className="text-cyan" />
                      <span>Input Arguments (Schema Validated)</span>
                    </div>
                    <pre className="json-code-block">
                      {JSON.stringify(tool.input, null, 2)}
                    </pre>
                  </div>

                  <div className="payload-panel">
                    <div className="panel-header">
                      <Database size={13} className="text-emerald" />
                      <span>Output Result & Mutated Application State</span>
                    </div>
                    <pre className="json-code-block">
                      {JSON.stringify(tool.output, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-module-state">
            <Cpu size={36} className="text-muted" />
            <p>No tool executions match your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
