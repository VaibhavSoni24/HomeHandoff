import React from 'react';
import { ShieldCheck, X, CheckCircle, ExternalLink, Cpu, Sparkles } from 'lucide-react';

interface DisclosuresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclosuresModal: React.FC<DisclosuresModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large glass-panel-elevated" onClick={e => e.stopPropagation()}>
        <div className="disclosure-modal-header">
          <div className="disclosure-title-wrap">
            <div className="disclosure-badge">
              <ShieldCheck size={18} className="text-cyan" />
              <span>Amazon Developer Hackathon — Alexa+ Track</span>
            </div>
            <h2 className="modal-title">Honest Disclosure & Simulated Architecture</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="disclosure-content-body">
          <div className="disclosure-notice-box">
            <strong>Judging Note:</strong> HomeHandoff uses the officially permitted <em>simulated Alexa+ web-experience route</em>. 
            All simulated integrations operate within this high-fidelity client sandbox and do <strong>not</strong> require or pretend to be 
            connected to paid production Amazon cloud services.
          </div>

          <h3 className="disclosure-subheading">Simulated Integration Touchpoints:</h3>
          <div className="integrations-list">
            <div className="integration-item">
              <div className="integration-icon-wrap cyan">
                <Sparkles size={16} />
              </div>
              <div className="integration-info">
                <h4>1. Alexa Voice Service (AVS) & Conversational Agent</h4>
                <p>
                  Simulates multi-turn Alexa+ conversational intent classification and multi-step decomposition. 
                  Includes optional voice output via the browser's native Web Speech API and visual soundwave equalizer bars.
                </p>
              </div>
            </div>

            <div className="integration-item">
              <div className="integration-icon-wrap emerald">
                <Cpu size={16} />
              </div>
              <div className="integration-info">
                <h4>2. Alexa Smart Home Skills API</h4>
                <p>
                  Simulates device state control and scheduled routines for Ecobee Thermostats (pre-conditioning climate), 
                  Philips Hue lighting scenes (Warm Welcome), Schlage Smart Deadbolts (temporary guest PIN code generation), 
                  and robot vacuum scheduling.
                </p>
              </div>
            </div>

            <div className="integration-item">
              <div className="integration-icon-wrap amber">
                <CheckCircle size={16} />
              </div>
              <div className="integration-info">
                <h4>3. Alexa Shopping List API</h4>
                <p>
                  Simulates synchronized grocery and guest amenity lists with aisle-by-aisle organization, 
                  quantity tagging, and checkable purchase status.
                </p>
              </div>
            </div>

            <div className="integration-item">
              <div className="integration-icon-wrap purple">
                <ExternalLink size={16} />
              </div>
              <div className="integration-info">
                <h4>4. Household Calendar & Tool Mutator Engine</h4>
                <p>
                  Unlike decorative chatbot mocks, every tool call executed by the agent (e.g. <code>calendar.createEvent</code>, 
                  <code>calendar.updateEvent</code>, <code>tasks.rescheduleAssociated</code>) directly mutates 
                  the actual application state and updates all linked views and readiness metrics in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="disclosure-footer-meta">
            <span>Built by Vaibhav Soni for Amazon Developer Hackathon (Alexa+ Track)</span>
            <button className="primary-confirm-btn" onClick={onClose}>
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
