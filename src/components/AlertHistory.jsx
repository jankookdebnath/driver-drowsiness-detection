import React from 'react';
import { AlertTriangle, Clock, Trash2 } from 'lucide-react';

const levelConfig = {
  1: { label: 'WARNING', color: 'var(--accent-yellow)', emoji: '⚠️' },
  2: { label: 'DANGER', color: 'var(--accent-red)', emoji: '🚨' },
  3: { label: 'CRITICAL', color: '#ff1744', emoji: '🔴' },
};

export default function AlertHistory({ alertHistory, onClear }) {
  if (!alertHistory || alertHistory.length === 0) {
    return (
      <div className="alert-history-empty">
        <AlertTriangle size={32} color="var(--text-secondary)" strokeWidth={1} />
        <p>No alerts recorded yet</p>
        <p className="subtext">Alerts will appear here when detected</p>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="alert-history">
      <div className="alert-history-header">
        <span className="alert-count-badge">{alertHistory.length} events</span>
        {onClear && (
          <button className="btn-icon" onClick={onClear} title="Clear history">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="alert-history-list">
        {[...alertHistory].reverse().map((alert, i) => {
          const config = levelConfig[alert.alertLevel] || levelConfig[1];
          return (
            <div key={alert.id || i} className={`alert-history-item level-${alert.alertLevel}`}>
              <div className="alert-history-left">
                <span className="alert-level-badge" style={{ background: config.color }}>
                  {config.emoji} L{alert.alertLevel}
                </span>
                <div className="alert-history-info">
                  <span className="alert-state">{alert.state}</span>
                  {alert.durationInPreviousState > 0 && (
                    <span className="alert-duration">
                      after {alert.durationInPreviousState.toFixed(1)}s in {alert.previousState}
                    </span>
                  )}
                </div>
              </div>
              <div className="alert-history-time">
                <Clock size={12} />
                {formatTime(alert.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
