import React from 'react';
import { RotateCcw, Volume2, VolumeX, Info, CheckCircle2 } from 'lucide-react';
import type { HouseholdState } from '../types/household';
import { computePlanReadiness } from '../utils/readiness';

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
  const readiness = computePlanReadiness(state);

  return (
    <header className="app-header">
      <div className="header-brand-section">
        <div className="brand-icon-box" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M16 6L6 14.5V25C6 25.55 6.45 26 7 26H25C25.55 26 26 25.55 26 25V14.5L16 6Z" 
              fill="#0369a1" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeLinejoin="round"
            />
            <path 
              d="M11 17.5L14.5 21L21 14.5" 
              stroke="#ffffff" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="brand-text-block">
          <div className="brand-title-row">
            <h1 className="brand-heading">HomeHandoff</h1>
            <button 
              type="button" 
              className="prototype-badge" 
              onClick={onOpenDisclosure}
              title="Click to view Hackathon Architecture & Simulated Integrations"
            >
              Simulated Alexa+ Integration
            </button>
          </div>
          <p className="brand-tagline">Autonomous Household Coordination Demo</p>
        </div>
      </div>

      <div className="header-controls">
        {readiness.hasActivePlan ? (
          <div className="header-status-indicator" title="Preparation Task Progress">
            <div className="status-progress-track">
              <div 
                className="status-progress-fill" 
                style={{ width: `${readiness.readinessPercent}%` }}
              />
            </div>
            <span className="status-progress-text">
              <CheckCircle2 size={13} className="status-icon-emerald" />
              <strong>{readiness.completedTasks}/{readiness.totalTasks}</strong> tasks ({readiness.readinessPercent}%)
            </span>
          </div>
        ) : (
          <div className="header-status-idle">
            <span className="idle-indicator-dot" />
            <span>Ready for Instructions</span>
          </div>
        )}

        <div className="header-btn-group">
          <button 
            type="button"
            className={`btn-secondary ${state.settings.voiceFeedback ? 'btn-active' : ''}`}
            onClick={onToggleVoice}
            title={state.settings.voiceFeedback ? 'Speech output enabled (click to mute)' : 'Speech output muted (click to enable)'}
            aria-label="Toggle voice output"
          >
            {state.settings.voiceFeedback ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="btn-label">{state.settings.voiceFeedback ? (isSpeaking ? 'Speaking...' : 'Voice On') : 'Voice Off'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onOpenDisclosure}
            title="Amazon Developer Hackathon Disclosures & Architecture"
          >
            <Info size={15} />
            <span className="btn-label">Disclosures</span>
          </button>

          <button 
            type="button"
            className="btn-secondary btn-reset"
            onClick={onResetDemo}
            title="Reset application to clean seed state"
          >
            <RotateCcw size={15} />
            <span className="btn-label">Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
