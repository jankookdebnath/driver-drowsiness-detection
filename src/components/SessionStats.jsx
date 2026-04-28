import React from 'react';
import { Shield, AlertTriangle, Eye, Wind, Brain, Zap } from 'lucide-react';

export default function SessionStats({ stats, mlStatus }) {
  const safetyColor = stats.safetyScore >= 80 ? 'var(--accent-green)' : stats.safetyScore >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  // SVG donut chart for safety score
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.safetyScore / 100) * circumference;

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="session-stats">
      {/* Safety Score Ring */}
      <div className="safety-score-container">
        <svg width="130" height="130" viewBox="0 0 130 130" className="safety-ring">
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke={safetyColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="safety-score-text">
          <span className="safety-value" style={{ color: safetyColor }}>
            {stats.safetyScore}%
          </span>
          <span className="safety-label">Safety Score</span>
        </div>
      </div>

      {/* Event Counters */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-green)' }}>
            <Shield size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatDuration(stats.alertTime)}</span>
            <span className="stat-label">Alert Time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-red)' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatDuration(stats.dangerTime)}</span>
            <span className="stat-label">Danger Time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-yellow)' }}>
            <Eye size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.drowsyEvents}</span>
            <span className="stat-label">Drowsy Events</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#ff1744' }}>
            <Zap size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.microsleepEvents}</span>
            <span className="stat-label">Microsleeps</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-yellow)' }}>
            <Wind size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.yawningEvents}</span>
            <span className="stat-label">Yawns</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-blue)' }}>
            <Brain size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.distractionEvents}</span>
            <span className="stat-label">Distractions</span>
          </div>
        </div>
      </div>

      {/* ML Model Status */}
      {mlStatus && (
        <div className="ml-status-card">
          <div className="ml-status-header">
            <Brain size={16} color="var(--accent-blue)" />
            <span>ML Model Status</span>
          </div>
          <div className="ml-status-body">
            <div className="ml-stat-row">
              <span>Status</span>
              <span className={mlStatus.isActive ? 'ml-active' : 'ml-training'}>
                {mlStatus.isActive ? '● Active' : '◐ Training'}
              </span>
            </div>
            <div className="ml-stat-row">
              <span>Samples</span>
              <span>{mlStatus.trainedSamples} / {mlStatus.minSamples}</span>
            </div>
            <div className="ml-stat-row">
              <span>Accuracy</span>
              <span>{mlStatus.accuracy}%</span>
            </div>
            <div className="ml-progress-bar">
              <div
                className="ml-progress-fill"
                style={{
                  width: `${Math.min(100, (mlStatus.trainedSamples / mlStatus.minSamples) * 100)}%`,
                  background: mlStatus.isActive ? 'var(--accent-green)' : 'var(--accent-blue)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
