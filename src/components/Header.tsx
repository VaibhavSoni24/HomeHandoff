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
    <header className="header-container glass-panel">
      <div className="header-left">
        <div className="brand-logo-wrap">
          <div className="brand-glow-halo"></div>
          <div className="brand-logo-icon">
            {/* Matching HomeHandoff house + workflow checkmark brand mark */}
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M16 4.5 L4.5 14 L7 14 L7 26.5 C7 27.3 7.7 28 8.5 28 L23.5 28 C24.3 28 25 27.3 25 26.5 L25 14 L27.5 14 Z" 
                stroke="url(#header-brand-grad)" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M11 17.5 L14.5 21 L21 14.5" 
                stroke="#38bdf8" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <circle cx="11" cy="17.5" r="1.5" fill="#06b6d4" />
              <circle cx="21" cy="14.5" r="1.5" fill="#a855f7" />
              <defs>
                <linearGradient id="header-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
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
        {readiness.hasActivePlan ? (
          <div className="readiness-chip" title="Current Active Plan Readiness">
            <div className="readiness-meter">
              <div 
                className="readiness-fill" 
                style={{ width: `${readiness.readinessPercent}%` }}
              ></div>
            </div>
            <div className="readiness-label">
              <CheckCircle2 size={14} className="text-emerald" />
              <span>Prep Readiness: <strong>{readiness.readinessPercent}%</strong></span>
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
