import React from 'react';
import { Home, Sparkles, RotateCcw, Volume2, VolumeX, Info, CheckCircle2 } from 'lucide-react';
import type { HouseholdState } from '../types/household';

interface HeaderProps {
  state: HouseholdState;
  onResetDemo: () => void;
  onToggleVoice: () => void;
  onOpenDisclosure: () => void;
  isSpeaking: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onResetDemo,
  onToggleVoice,
  onOpenDisclosure,
  isSpeaking
}) => {
  const activePlan = state.activePlan;
  const relevantTasks = state.tasks.filter(t => activePlan && t.planId === activePlan.id);
  const completedTasks = relevantTasks.filter(t => t.completed);
  const readiness = relevantTasks.length > 0 ? Math.round((completedTasks.length / relevantTasks.length) * 100) : null;

  return (
    <header className="header-container glass-panel">
      <div className="header-left">
        <div className="brand-logo-wrap">
          <div className="brand-glow-halo"></div>
          <div className="brand-logo-icon">
            <Home size={22} className="logo-icon-svg" />
            <Sparkles size={12} className="logo-sparkle" />
          </div>
        </div>

        <div className="brand-titles">
          <div className="brand-row">
            <h1 className="brand-title">HomeHandoff</h1>
            <div className="alexa-track-badge" onClick={onOpenDisclosure} title="Click to view Hackathon Simulation Disclosure">
              <span className="alexa-pulse-dot"></span>
              Alexa+ Track · Simulated
            </div>
          </div>
          <p className="brand-tagline">Context-Aware Autonomous Household Coordination Agent</p>
        </div>
      </div>

      <div className="header-right">
        {readiness !== null ? (
          <div className="readiness-chip" title="Current Active Plan Readiness">
            <div className="readiness-meter">
              <div 
                className="readiness-fill" 
                style={{ width: `${readiness}%` }}
              ></div>
            </div>
            <div className="readiness-label">
              <CheckCircle2 size={14} className="text-emerald" />
              <span>Prep Readiness: <strong>{readiness}%</strong></span>
            </div>
          </div>
        ) : (
          <div className="idle-chip">
            <span className="idle-dot"></span>
            <span>All Systems Synchronized</span>
          </div>
        )}

        <button 
          className={`voice-toggle-btn ${state.settings.voiceFeedback ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
          onClick={onToggleVoice}
          title={state.settings.voiceFeedback ? 'Voice Output Enabled (Click to Mute)' : 'Voice Output Muted (Click to Enable Alexa Voice)'}
          aria-label="Toggle voice feedback"
        >
          {state.settings.voiceFeedback ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="voice-btn-text">{state.settings.voiceFeedback ? 'Voice On' : 'Voice Muted'}</span>
          {isSpeaking && <span className="speaking-wave"></span>}
        </button>

        <button
          className="disclosure-btn"
          onClick={onOpenDisclosure}
          title="Amazon Developer Hackathon Architecture & Simulated Integrations"
        >
          <Info size={16} />
          <span>Disclosures</span>
        </button>

        <button 
          className="reset-btn"
          onClick={onResetDemo}
          title="Reset application to clean initial seed data"
        >
          <RotateCcw size={16} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
