import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, ShieldAlert, RotateCcw, Play, Square, Zap } from 'lucide-react';
import WebcamAnalyzer from './components/WebcamAnalyzer';
import DashboardMetrics from './components/DashboardMetrics';
import AlertManager from './utils/AlertManager';
import DataLogger from './utils/DataLogger';
import DrowsinessML from './utils/DrowsinessML';
import { sendAlertNotification } from './components/TwilioConfig';

// Break reminder thresholds (in seconds)
const BREAK_REMINDERS = [
  { at: 1800, title: '30 Min Driving', message: 'Consider taking a short break.', urgent: false },
  { at: 3600, title: '1 Hour Driving', message: 'You should take a break soon!', urgent: false },
  { at: 5400, title: '1.5 Hours Driving', message: 'Please pull over and rest!', urgent: true },
];

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [driverState, setDriverState] = useState('Alert');
  const [alertLevel, setAlertLevel] = useState(0);
  const [metrics, setMetrics] = useState({
    ear: 0, mar: 0, yaw: 0, blinkRate: 0, isTracking: false, closedFramesRatio: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [alertHistory, setAlertHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    totalEvents: 0, drowsyEvents: 0, microsleepEvents: 0,
    yawningEvents: 0, distractionEvents: 0, fatigueEvents: 0,
    alertTime: 0, dangerTime: 0, safetyScore: 100, sessionDuration: 0,
  });
  const [nightMode, setNightMode] = useState(false);
  const [mlEnabled, setMlEnabled] = useState(true);
  const [breakReminder, setBreakReminder] = useState(null);
  const [screenFlash, setScreenFlash] = useState(false);

  // Refs for persistent instances
  const alertManagerRef = useRef(null);
  const dataLoggerRef = useRef(null);
  const mlModelRef = useRef(null);
  const lastBreakReminder = useRef(0);
  const prevDriverState = useRef('Alert');

  // Initialize on mount
  useEffect(() => {
    alertManagerRef.current = new AlertManager();
    dataLoggerRef.current = new DataLogger();
    mlModelRef.current = new DrowsinessML();

    // Set notification callback (browser notification + SMS)
    alertManagerRef.current.setSMSCallback((state) => {
      sendAlertNotification(state);
    });

    return () => {
      if (alertManagerRef.current) alertManagerRef.current.destroy();
    };
  }, []);

  // Alert system — responds to state changes
  useEffect(() => {
    if (!isRunning || !alertManagerRef.current) {
      if (alertManagerRef.current) alertManagerRef.current.stop();
      setAlertLevel(0);
      return;
    }

    const level = AlertManager.getAlertLevel(driverState);
    setAlertLevel(level);
    alertManagerRef.current.update(driverState);

    // Screen flash for Level 3
    if (level === 3) {
      setScreenFlash(true);
      const t = setTimeout(() => setScreenFlash(false), 200);
      const interval = setInterval(() => {
        setScreenFlash(prev => !prev);
      }, 400);
      return () => {
        clearTimeout(t);
        clearInterval(interval);
        setScreenFlash(false);
      };
    } else {
      setScreenFlash(false);
    }
  }, [driverState, isRunning]);

  // Timer
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Break reminders
  useEffect(() => {
    if (!isRunning) return;

    for (const reminder of BREAK_REMINDERS) {
      if (elapsedTime >= reminder.at && lastBreakReminder.current < reminder.at) {
        setBreakReminder(reminder);
        lastBreakReminder.current = reminder.at;

        // Auto-dismiss non-urgent reminders after 30 seconds
        if (!reminder.urgent) {
          const t = setTimeout(() => setBreakReminder(null), 30000);
          return () => clearTimeout(t);
        }
      }
    }
  }, [elapsedTime, isRunning]);

  // Update stats periodically
  useEffect(() => {
    if (!isRunning || !dataLoggerRef.current) return;

    const interval = setInterval(() => {
      setSessionStats(dataLoggerRef.current.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return hrs !== '00' ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
  };

  const handleStateUpdate = useCallback((newState, newMetrics) => {
    // Feed to ML model
    if (mlModelRef.current && mlEnabled) {
      mlModelRef.current.addTrainingExample(newMetrics, newState);

      // If ML is active, use its prediction
      const mlPrediction = mlModelRef.current.getPredictedState(newMetrics);
      if (mlPrediction && mlPrediction.isMLActive) {
        // ML takes over — but we still use rule-based for critical states for safety
        if (!['Microsleep', 'Drowsy'].includes(newState)) {
          newState = mlPrediction.state;
        }
      }
    }

    setDriverState(newState);
    setMetrics(newMetrics);

    // Log state change
    if (dataLoggerRef.current && newState !== prevDriverState.current) {
      const level = AlertManager.getAlertLevel(newState);
      const entry = dataLoggerRef.current.logStateChange(newState, level, newMetrics);
      if (entry && level > 0) {
        setAlertHistory(prev => [...prev, entry]);
      }
      prevDriverState.current = newState;
    }
  }, [mlEnabled]);

  const handleStart = () => {
    if (isRunning) {
      setDriverState('Alert');
      if (alertManagerRef.current) alertManagerRef.current.stop();
    } else {
      if (dataLoggerRef.current) dataLoggerRef.current.resetSession();
      setAlertHistory([]);
      lastBreakReminder.current = 0;
      setBreakReminder(null);

      // Initialize audio context on user gesture
      if (alertManagerRef.current) alertManagerRef.current.init();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setElapsedTime(0);
    lastBreakReminder.current = 0;
    setBreakReminder(null);
  };

  const getAlertConfig = () => {
    switch (driverState) {
      case 'Alert':
        return { class: 'normal', level: 0, title: 'DRIVER ALERT', subtitle: 'All systems nominal', icon: <ShieldAlert size={40} color="var(--accent-green)" /> };
      case 'Fatigued':
        return { class: 'warning', level: 1, title: '⚠️ LEVEL 1 — FATIGUE WARNING', subtitle: 'Early fatigue signs. Consider taking a break.', icon: <ShieldAlert size={40} color="var(--accent-yellow)" /> };
      case 'Drowsy':
        return { class: 'critical', level: 2, title: '🚨 LEVEL 2 — DROWSINESS ALERT', subtitle: 'Heavy drowsiness detected! Wake up!', icon: <ShieldAlert size={40} color="var(--accent-red)" /> };
      case 'Microsleep':
        return { class: 'emergency', level: 3, title: '🔴 LEVEL 3 — MICROSLEEP DETECTED', subtitle: 'CRITICAL STATE! Eyes closed for prolonged period! PULL OVER NOW!', icon: <Zap size={40} color="#ff1744" /> };
      case 'Yawning / Distracted':
        return { class: 'warning', level: 1, title: '⚠️ LEVEL 1 — BEHAVIOR ALERT', subtitle: 'Excessive mouth movement or yawning detected.', icon: <Activity size={40} color="var(--accent-yellow)" /> };
      case 'Not Concentrating':
        return { class: 'critical', level: 2, title: '🚨 LEVEL 2 — DISTRACTION ALERT', subtitle: 'Head turned away from the road!', icon: <ShieldAlert size={40} color="var(--accent-red)" /> };
      case 'Warning':
        return { class: 'warning', level: 1, title: '⚠️ TRACKING LOST', subtitle: 'Face not detected in frame.', icon: <Activity size={40} color="var(--accent-yellow)" /> };
      default:
        return { class: 'normal', level: 0, title: 'SYSTEM STANDBY', subtitle: 'Press start to begin monitoring', icon: <ShieldAlert size={40} color="var(--text-secondary)" /> };
    }
  };

  const alertConfig = isRunning ? getAlertConfig() : {
    class: 'normal', level: 0,
    title: 'SYSTEM STANDBY',
    subtitle: 'Press start to begin monitoring',
    icon: <ShieldAlert size={40} color="var(--text-secondary)" />,
  };

  const mlStatus = mlModelRef.current ? mlModelRef.current.getStatus() : null;

  return (
    <>
      {/* Screen Flash Overlay for Level 3 */}
      {screenFlash && <div className="screen-flash-overlay" />}

      {/* Edge Glow for Level 2+ */}
      {alertLevel >= 2 && isRunning && <div className={`edge-glow level-${alertLevel}`} />}

      <header>
        <Activity className="logo-icon" size={32} />
        <div className="header-title">
          <h1>Driver Drowsiness Detection System</h1>
          <p>Multi-Sensor AI Analysis · ML Classifier · Real-Time Alert System</p>
        </div>
        {isRunning && (
          <div className={`header-alert-badge level-${alertLevel}`}>
            {alertLevel === 0 ? 'SAFE' : `LEVEL ${alertLevel}`}
          </div>
        )}
      </header>

      <main className="dashboard-container">
        {/* Main Panel */}
        <div className="main-content">
          <div className="controls">
            <div className="timer">{formatTime(elapsedTime)}</div>
            <button className="btn" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
            <button
              className={`btn ${isRunning ? '' : 'primary'}`}
              onClick={handleStart}
              style={isRunning ? { borderColor: 'var(--accent-red)', color: 'var(--accent-red)' } : {}}
            >
              {isRunning ? <Square size={16} /> : <Play size={16} />}
              {isRunning ? 'Stop Monitoring' : 'Start Camera'}
            </button>
          </div>

          <div className={`alert-banner ${alertConfig.class}`}>
            {alertConfig.level > 0 && (
              <div className="alert-level-indicator">
                {[1, 2, 3].map(l => (
                  <span key={l} className={`level-dot ${l <= alertConfig.level ? 'active' : ''}`} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {alertConfig.icon}
            </div>
            <h2>{alertConfig.title}</h2>
            <p>{alertConfig.subtitle}</p>
          </div>

          <div className="panel" style={{ padding: '0.5rem', marginBottom: '1.5rem' }}>
            <WebcamAnalyzer
              isRunning={isRunning}
              onStateUpdate={handleStateUpdate}
              nightMode={nightMode}
              alertLevel={alertLevel}
            />
          </div>

          {/* Legend */}
          <div className="state-legend-grid">
            {[
              { state: 'Alert', emoji: '😊', label: 'Alert', desc: 'Normal driving', color: 'var(--accent-green)', level: 0 },
              { state: 'Fatigued', emoji: '🥱', label: 'Fatigued', desc: 'Early fatigue signs', color: 'var(--accent-yellow)', level: 1 },
              { state: 'Drowsy', emoji: '😴', label: 'Drowsy', desc: 'Heavy drowsiness', color: 'var(--accent-red)', level: 2 },
              { state: 'Microsleep', emoji: '⚡', label: 'Microsleep', desc: 'Critical (eyes closed > 1s)', color: '#ff1744', level: 3 },
              { state: 'Yawning / Distracted', emoji: '🗣️', label: 'Mouth Movement', desc: 'Yawning / Eating / Drinking', color: 'var(--accent-yellow)', level: 1 },
              { state: 'Not Concentrating', emoji: '👀', label: 'Distracted', desc: 'Looking away from road', color: 'var(--accent-red)', level: 2 },
            ].map(item => (
              <div
                key={item.state}
                className={`panel legend-card ${driverState === item.state ? 'active' : ''}`}
                style={{ borderColor: driverState === item.state ? item.color : '' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: item.color }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                  {item.label}
                  <span className="legend-level">L{item.level}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel (Dashboard) */}
        <DashboardMetrics
          driverState={isRunning ? driverState : 'Standby'}
          metrics={metrics}
          alertHistory={alertHistory}
          sessionStats={sessionStats}
          mlStatus={mlStatus}
          mlEnabled={mlEnabled}
          nightMode={nightMode}
          breakReminder={breakReminder}
          totalLogs={dataLoggerRef.current ? dataLoggerRef.current.getLogs().length : 0}
          onExportCSV={() => dataLoggerRef.current?.exportToCSV()}
          onClearLogs={() => {
            dataLoggerRef.current?.clearLogs();
            setAlertHistory([]);
          }}
          onClearHistory={() => setAlertHistory([])}
          onToggleNightMode={() => setNightMode(prev => !prev)}
          onToggleML={() => {
            setMlEnabled(prev => !prev);
            if (mlModelRef.current) {
              mlModelRef.current.setActive(!mlEnabled);
            }
          }}
        />
      </main>
    </>
  );
}
