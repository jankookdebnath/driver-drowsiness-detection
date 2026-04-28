import React, { useState } from 'react';
import { Eye, BarChart3, Clock, History, Download, Trash2, Moon, Sun, Brain, Coffee } from 'lucide-react';
import AlertHistory from './AlertHistory';
import SessionStats from './SessionStats';
import TwilioConfig from './TwilioConfig';

const TABS = [
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'stats', label: 'Stats', icon: Eye },
];

export default function DashboardMetrics({
  driverState,
  metrics,
  alertHistory,
  sessionStats,
  mlStatus,
  mlEnabled,
  nightMode,
  breakReminder,
  totalLogs,
  onExportCSV,
  onClearLogs,
  onClearHistory,
  onToggleNightMode,
  onToggleML,
}) {
  const [activeTab, setActiveTab] = useState('metrics');

  return (
    <div className="dashboard-sidebar">
      {/* Tab Navigation */}
      <div className="tab-nav">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'history' && alertHistory.length > 0 && (
                <span className="tab-badge">{alertHistory.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'metrics' && (
          <MetricsTab
            driverState={driverState}
            metrics={metrics}
            mlStatus={mlStatus}
            mlEnabled={mlEnabled}
            nightMode={nightMode}
            onToggleNightMode={onToggleNightMode}
            onToggleML={onToggleML}
          />
        )}
        {activeTab === 'history' && (
          <AlertHistory alertHistory={alertHistory} onClear={onClearHistory} />
        )}
        {activeTab === 'stats' && (
          <SessionStats stats={sessionStats} mlStatus={mlStatus} />
        )}
      </div>

      {/* Break Reminder */}
      {breakReminder && (
        <div className={`break-reminder ${breakReminder.urgent ? 'urgent' : ''}`}>
          <Coffee size={18} />
          <div>
            <strong>{breakReminder.title}</strong>
            <p>{breakReminder.message}</p>
          </div>
        </div>
      )}

      {/* SMS Config */}
      <TwilioConfig />

      {/* Data Export Actions */}
      <div className="dashboard-actions">
        <button className="btn action-btn" onClick={onExportCSV}>
          <Download size={14} /> Export CSV
          {totalLogs > 0 && <span className="action-badge">{totalLogs}</span>}
        </button>
        <button className="btn action-btn danger" onClick={onClearLogs}>
          <Trash2 size={14} /> Clear Data
        </button>
      </div>
    </div>
  );
}

// --- Metrics Tab Content ---
function MetricsTab({ driverState, metrics, mlStatus, mlEnabled, nightMode, onToggleNightMode, onToggleML }) {
  return (
    <div className="metrics-tab">
      {/* EAR Metric */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-name">
            <Eye size={16} color="var(--accent-green)" />
            Eye Aspect Ratio (EAR)
          </div>
          <div className={`metric-value ${metrics.ear < 0.22 ? 'red' : 'green'}`}>
            {metrics.ear || '0.00'}
          </div>
        </div>
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${metrics.ear < 0.22 ? 'red' : 'green'}`}
            style={{ width: `${Math.min(100, (parseFloat(metrics.ear) / 0.4) * 100)}%` }}
          />
        </div>
        <div className="metric-labels">
          <span>Closed (0.0)</span>
          <span>Open (0.4)</span>
        </div>
        <div className="metric-threshold">
          <span>Threshold: 0.22</span>
        </div>
      </div>

      {/* MAR Metric */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-name">
            <span style={{ fontSize: '16px' }}>👄</span>
            Mouth Aspect Ratio (MAR)
          </div>
          <div className={`metric-value ${metrics.mar > 0.45 ? 'yellow' : 'green'}`}>
            {metrics.mar || '0.00'}
          </div>
        </div>
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${metrics.mar > 0.45 ? 'yellow' : 'green'}`}
            style={{ width: `${Math.min(100, (parseFloat(metrics.mar) / 0.8) * 100)}%` }}
          />
        </div>
        <div className="metric-labels">
          <span>Closed (0.0)</span>
          <span>Wide (0.8)</span>
        </div>
      </div>

      {/* Yaw Metric */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-name">
            <span style={{ fontSize: '16px' }}>🧭</span>
            Head Yaw Ratio
          </div>
          <div className={`metric-value ${(metrics.yaw < 0.5 || metrics.yaw > 2.0) ? 'red' : 'green'}`}>
            {metrics.yaw || '1.00'}
          </div>
        </div>
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${(metrics.yaw < 0.5 || metrics.yaw > 2.0) ? 'red' : 'green'}`}
            style={{ width: `${Math.min(100, Math.abs(parseFloat(metrics.yaw) - 1.0) * 100 + 5)}%` }}
          />
        </div>
        <div className="metric-labels">
          <span>Right</span>
          <span>Center (1.0)</span>
          <span>Left</span>
        </div>
      </div>

      {/* Blink Rate */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-name">
            <Eye size={16} color="var(--accent-blue)" />
            Blink Rate
          </div>
          <div className={`metric-value ${(metrics.blinkRate > 20 || metrics.blinkRate < 5) ? 'yellow' : 'green'}`}>
            {metrics.blinkRate} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>bpm</span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${(metrics.blinkRate > 20 || metrics.blinkRate < 5) ? 'yellow' : 'green'}`}
            style={{ width: `${Math.min(100, (metrics.blinkRate / 30) * 100)}%` }}
          />
        </div>
        <div className="metric-labels">
          <span>0</span>
          <span>Normal: 10-20</span>
          <span>30+</span>
        </div>
      </div>

      {/* Live Data */}
      <div className="live-data-card">
        <div className="live-data-header">
          <span className={`live-dot ${driverState !== 'Standby' ? 'active' : ''}`}></span>
          Live Data
        </div>
        <div className="live-data-row">
          <span>State</span>
          <span className={`state-badge ${
            ['Drowsy', 'Microsleep', 'Not Concentrating'].includes(driverState) ? 'critical' :
            ['Fatigued', 'Yawning / Distracted', 'Warning'].includes(driverState) ? 'warning' : 'normal'
          }`}>
            {driverState}
          </span>
        </div>
        <div className="live-data-row">
          <span>Face Tracked</span>
          <span>{metrics.isTracking ? '✓ Yes' : '✗ No'}</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="toggle-row">
        <div className="toggle-item" onClick={onToggleNightMode}>
          {nightMode ? <Sun size={16} color="var(--accent-yellow)" /> : <Moon size={16} />}
          <span>Night Mode</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={nightMode} onChange={onToggleNightMode} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="toggle-item" onClick={onToggleML}>
          <Brain size={16} color={mlEnabled ? 'var(--accent-green)' : 'var(--text-secondary)'} />
          <span>ML Model</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={mlEnabled} onChange={onToggleML} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
