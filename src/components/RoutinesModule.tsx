import React from 'react';
import { 
  Cpu, 
  Thermometer, 
  Lightbulb, 
  Lock, 
  Power, 
  Clock, 
  Wind,
  Info
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
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'thermostat':
        return <Thermometer size={16} />;
      case 'lighting':
        return <Lightbulb size={16} />;
      case 'lock':
        return <Lock size={16} />;
      case 'vacuum':
        return <Wind size={16} />;
      default:
        return <Cpu size={16} />;
    }
  };

  // Derive all connected devices dynamically from the simulated routines
  const deviceMap = new Map<string, {
    name: string;
    type: string;
    controllingRoutine: string;
    targetDescription: string;
    simulatedValue: string;
    isArmed: boolean;
  }>();

  routines.forEach(routine => {
    routine.actions.forEach(action => {
      const key = `${action.deviceType}-${action.deviceName}`;
      let simVal = '';
      if (action.deviceType === 'thermostat') {
        simVal = action.targetState.temperature ? `${action.targetState.temperature}°F Target` : 'Set to 71°F';
      } else if (action.deviceType === 'lighting') {
        simVal = action.targetState.scene ? `${action.targetState.scene} (${action.targetState.brightness || 65}%)` : 'Warm Welcome';
      } else if (action.deviceType === 'lock') {
        simVal = action.targetState.pinCode 
          ? `Code: ${action.targetState.pinCode} (Client simulation — no physical lock contacted)`
          : '[Simulated Keypad Demo — No Physical Lock Contacted]';
      } else if (action.deviceType === 'vacuum') {
        simVal = 'Pre-Arrival Quiet Sweep';
      } else {
        simVal = 'Automated Action';
      }

      deviceMap.set(key, {
        name: action.deviceName,
        type: action.deviceType,
        controllingRoutine: routine.name,
        targetDescription: action.actionDescription,
        simulatedValue: simVal,
        isArmed: routine.enabled
      });
    });
  });

  const simulatedDevices = Array.from(deviceMap.values());

  return (
    <div className="module-panel surface-card">
      {/* Header bar */}
      <div className="module-header-row">
        <div>
          <h2 className="module-heading">Smart Home Routines (Simulated)</h2>
          <p className="module-subheading">
            Simulated Alexa Smart Home Skills API orchestrating thermostat, lighting, access controls, and robotic cleaning
          </p>
        </div>

        <div className="module-header-actions">
          <div className="simulated-pill-notice" title="High-fidelity client simulation for hackathon judging">
            <Info size={13} />
            <span>Simulated Device Fleet</span>
          </div>
        </div>
      </div>

      {/* Routines List Section */}
      <div className="routines-block">
        <h3 className="sub-block-title">Scheduled Automation Routines</h3>
        <div className="routines-list-grid">
          {routines.map(routine => {
            const isPlanRoutine = !!routine.planId;
            return (
              <div 
                key={routine.id} 
                className={`routine-card surface-card ${routine.enabled ? 'routine-enabled' : 'routine-disabled'}`}
              >
                <div className="routine-card-header">
                  <div className="routine-header-info">
                    <div className="routine-title-row">
                      <h4 className="routine-name">{routine.name}</h4>
                      {isPlanRoutine && (
                        <span className="badge badge-accent">Plan Routine</span>
                      )}
                    </div>
                    <div className="routine-trigger-line">
                      <Clock size={13} />
                      <span>{routine.trigger}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn-routine-toggle ${routine.enabled ? 'active' : ''}`}
                    onClick={() => onToggleRoutine(routine.id)}
                    aria-label={`Toggle routine ${routine.name}: currently ${routine.enabled ? 'armed' : 'idle'}`}
                  >
                    <Power size={13} />
                    <span>{routine.enabled ? 'Armed' : 'Disabled'}</span>
                  </button>
                </div>

                <div className="routine-actions-list">
                  <span className="actions-header-label">Configured Device Actions:</span>
                  {routine.actions.map((act, aIdx) => (
                    <div key={aIdx} className="routine-action-item">
                      <span className="action-device-icon">{getDeviceIcon(act.deviceType)}</span>
                      <div className="action-text-col">
                        <strong className="action-device-name">{act.deviceName}:</strong>{' '}
                        <span className="action-desc-body">{act.actionDescription}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived Simulated Device Status Grid */}
      <div className="routines-block">
        <h3 className="sub-block-title">Simulated Connected Hardware Telemetry</h3>
        <p className="sub-block-desc">
          Telemetry is derived directly from active routine action targets in application state. 
          No physical locks or external IoT accounts are contacted.
        </p>

        <div className="device-telemetry-grid">
          {simulatedDevices.map((dev, idx) => (
            <div key={idx} className="device-telemetry-card surface-card">
              <div className="device-card-top">
                <div className="device-title-box">
                  <span className="device-type-icon">{getDeviceIcon(dev.type)}</span>
                  <div>
                    <h5 className="device-name">{dev.name}</h5>
                    <span className="device-type-tag">{dev.type.toUpperCase()}</span>
                  </div>
                </div>
                <span className={`device-state-pill ${dev.isArmed ? 'armed' : 'idle'}`}>
                  {dev.isArmed ? 'Armed in Sandbox' : 'Idle'}
                </span>
              </div>

              <div className="device-target-value">
                <span className="target-value-text">{dev.simulatedValue}</span>
              </div>

              <div className="device-card-footer">
                <span className="controlling-routine-label">
                  Linked Routine: <strong>{dev.controllingRoutine}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
