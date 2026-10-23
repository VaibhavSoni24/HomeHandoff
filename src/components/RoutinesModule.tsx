import React from 'react';
import { 
  Cpu, 
  Thermometer, 
  Lightbulb, 
  Lock, 
  Sparkles, 
  Power, 
  Clock, 
  Wind
} from 'lucide-react';
import type { SmartRoutine } from '../types/household';

interface RoutinesModuleProps {
  routines: SmartRoutine[];
  onToggleRoutine: (routineId: string) => void;
}

export const RoutinesModule: React.FC<RoutinesModuleProps> = ({
  routines,
  onToggleRoutine
}) => {
  return (
    <div className="module-container glass-panel">
      {/* Header bar */}
      <div className="module-header">
        <div className="module-title-group">
          <div className="module-icon-wrap purple">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="module-title">Alexa+ Smart Home Routines & Device Automation</h2>
            <p className="module-subtitle">Simulated Alexa Smart Home Skills API orchestrating climate, lighting, and access controls</p>
          </div>
        </div>

        <div className="module-actions">
          <span className="badge badge-purple">
            <Sparkles size={11} /> Alexa+ Smart Home Engine
          </span>
        </div>
      </div>

      {/* Simulated Device Fleet Cards */}
      <div className="device-fleet-section">
        <h3 className="section-subheading">Connected Smart Home Fleet (Simulated)</h3>
        <div className="device-cards-grid">
          {/* Thermostat */}
          <div className="device-status-card glass-panel-elevated">
            <div className="device-card-header">
              <div className="device-icon-wrap cyan">
                <Thermometer size={18} />
              </div>
              <div className="device-info">
                <span className="device-name">Ecobee Smart Thermostat</span>
                <span className="device-room">Guest Suite & Main Floor</span>
              </div>
              <span className="device-status-pill online">Active</span>
            </div>
            <div className="device-main-reading">
              <span className="reading-value">71°F</span>
              <span className="reading-unit">Comfort Setpoint</span>
            </div>
            <div className="device-footer-state">
              <span>Mode: <strong>Auto Cool/Heat</strong></span>
              <span>Pre-conditioning: <strong>Armed</strong></span>
            </div>
          </div>

          {/* Lighting */}
          <div className="device-status-card glass-panel-elevated">
            <div className="device-card-header">
              <div className="device-icon-wrap amber">
                <Lightbulb size={18} />
              </div>
              <div className="device-info">
                <span className="device-name">Philips Hue Scenes</span>
                <span className="device-room">Foyer, Porch & Guest Room</span>
              </div>
              <span className="device-status-pill online">Armed</span>
            </div>
            <div className="device-main-reading">
              <span className="reading-value">Warm Welcome</span>
              <span className="reading-unit">65% Warm Amber Glow</span>
            </div>
            <div className="device-footer-state">
              <span>Trigger: <strong>Arrival Window</strong></span>
              <span>Porch Light: <strong>Synced</strong></span>
            </div>
          </div>

          {/* Smart Lock */}
          <div className="device-status-card glass-panel-elevated">
            <div className="device-card-header">
              <div className="device-icon-wrap emerald">
                <Lock size={18} />
              </div>
              <div className="device-info">
                <span className="device-name">Schlage Smart Deadbolt</span>
                <span className="device-room">Front Door Entryway</span>
              </div>
              <span className="device-status-pill online">Secure</span>
            </div>
            <div className="device-main-reading">
              <span className="reading-value">PIN: 8492</span>
              <span className="reading-unit">Temporary Guest Keypad Access</span>
            </div>
            <div className="device-footer-state">
              <span>Auto-Lock: <strong>Enabled</strong></span>
              <span>Weekend Pass: <strong>Active</strong></span>
            </div>
          </div>

          {/* Robot Vacuum */}
          <div className="device-status-card glass-panel-elevated">
            <div className="device-card-header">
              <div className="device-icon-wrap purple">
                <Wind size={18} />
              </div>
              <div className="device-info">
                <span className="device-name">Roborock S8 Pro Ultra</span>
                <span className="device-room">Living Area & Guest Suite</span>
              </div>
              <span className="device-status-pill standby">Docked</span>
            </div>
            <div className="device-main-reading">
              <span className="reading-value">Quiet Sweep</span>
              <span className="reading-unit">Pre-Arrival Cleaning Run</span>
            </div>
            <div className="device-footer-state">
              <span>Battery: <strong>100%</strong></span>
              <span>Next Run: <strong>Automated</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Routines List */}
      <div className="routines-list-section">
        <h3 className="section-subheading">Coordinated Routines</h3>
        <div className="routines-grid">
          {routines.map(routine => {
            return (
              <div 
                key={routine.id} 
                className={`routine-card glass-panel-elevated ${routine.enabled ? 'routine-active' : 'routine-disabled'} ${routine.planId ? 'plan-routine-highlight' : ''}`}
              >
                <div className="routine-card-top">
                  <div className="routine-title-wrap">
                    <div className="routine-title-row">
                      <h4 className="routine-name">{routine.name}</h4>
                      {routine.planId && (
                        <span className="badge badge-cyan">
                          <Sparkles size={11} /> Plan Synced
                        </span>
                      )}
                    </div>
                    <div className="routine-trigger-row">
                      <Clock size={13} className="text-secondary" />
                      <span>{routine.trigger}</span>
                    </div>
                  </div>

                  <button
                    className={`routine-power-toggle ${routine.enabled ? 'enabled' : 'disabled'}`}
                    onClick={() => onToggleRoutine(routine.id)}
                    title={routine.enabled ? 'Click to disable routine' : 'Click to enable routine'}
                  >
                    <Power size={16} />
                  </button>
                </div>

                <div className="routine-actions-list">
                  <span className="actions-header-label">Automated Actions ({routine.actions.length}):</span>
                  {routine.actions.map((act, aIdx) => (
                    <div key={aIdx} className="routine-action-item">
                      <span className="action-bullet-dot"></span>
                      <div className="action-desc">
                        <strong className="action-device-name">{act.deviceName}: </strong>
                        <span>{act.actionDescription}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="routine-footer">
                  <span className="routine-status-label">
                    Status: <strong>{routine.enabled ? 'Armed & Scheduled' : 'Paused'}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
