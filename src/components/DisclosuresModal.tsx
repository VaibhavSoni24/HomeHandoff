import React, { useEffect } from 'react';
import { Shield, X, Cpu, Calendar, ShoppingCart, MessageSquare } from 'lucide-react';

interface DisclosuresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclosuresModal: React.FC<DisclosuresModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-disc-title">
      <div className="modal-dialog modal-large surface-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="disclosure-title-group">
            <span className="badge badge-neutral">
              <Shield size={13} />
              <span>Hackathon Architecture Notice</span>
            </span>
            <h2 id="modal-disc-title" className="modal-title">Simulated Alexa+ Integrations Disclosure</h2>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close disclosures dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-content-body">
          <div className="disclosure-callout-box">
            <strong>Judging Transparency Note:</strong> HomeHandoff implements the officially permitted <em>simulated Alexa+ web-experience track</em> for the Amazon Developer Hackathon. All four simulated touchpoints execute deterministically within this client-side state engine. The application does <strong>not</strong> contact live Amazon cloud services or require paid consumer credentials.
          </div>

          <h3 className="disclosure-list-heading">Simulated Touchpoint Implementations:</h3>
          
          <div className="disclosure-touchpoints-list">
            <div className="touchpoint-row">
              <span className="touchpoint-icon"><MessageSquare size={16} /></span>
              <div className="touchpoint-info">
                <h4>1. Alexa Voice Service (AVS) & Intent Engine</h4>
                <p>
                  Natural language intent classification with multi-turn context memory. 
                  Includes optional voice output synthesized through the browser's native Web Speech API.
                </p>
              </div>
            </div>

            <div className="touchpoint-row">
              <span className="touchpoint-icon"><Calendar size={16} /></span>
              <div className="touchpoint-info">
                <h4>2. Alexa Household Calendar Integration</h4>
                <p>
                  Blocks visitor arrival and departure windows with pre-arrival buffer calculations. 
                  Every tool call (e.g. <code>calendar.createEvent</code>, <code>calendar.updateEvent</code>) mutates real application state.
                </p>
              </div>
            </div>

            <div className="touchpoint-row">
              <span className="touchpoint-icon"><ShoppingCart size={16} /></span>
              <div className="touchpoint-info">
                <h4>3. Alexa Shopping List API</h4>
                <p>
                  Manages guest amenities and grocery preferences organized by grocery aisle in local state (client simulation — no external Alexa cloud account connected). 
                  Items can be checked off and filtered by department.
                </p>
              </div>
            </div>

            <div className="touchpoint-row">
              <span className="touchpoint-icon"><Cpu size={16} /></span>
              <div className="touchpoint-info">
                <h4>4. Alexa Smart Home Skills API</h4>
                <p>
                  Simulates smart device state management for thermostats, lighting scenes, simulated access pass placeholders (SIMULATED-CODE-NOT-ISSUED), and robotic vacuum runs. 
                  No physical lock is contacted and no usable passcode is generated.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer disclosure-footer">
          <span className="disclosure-credit">Amazon Developer Hackathon — Alexa+ Track Submission</span>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
};
