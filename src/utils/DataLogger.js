/**
 * DataLogger — Persistent data logging with CSV export
 * Stores drowsiness detection events in localStorage and provides export functionality.
 */

const STORAGE_KEY = 'drowsiness_detection_logs';
const MAX_ENTRIES = 5000; // Prevent localStorage overflow

export class DataLogger {
  constructor() {
    this.logs = this._loadFromStorage();
    this.sessionStart = Date.now();
    this.lastState = null;
    this.stateStartTime = Date.now();
  }

  /**
   * Log a state change event
   */
  logStateChange(state, alertLevel, metrics) {
    const now = Date.now();
    const duration = this.lastState ? (now - this.stateStartTime) / 1000 : 0;

    // Only log if state actually changed or every 10 seconds for persistent states
    if (state !== this.lastState || duration >= 10) {
      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
        dateTime: new Date(now).toISOString(),
        state,
        alertLevel,
        previousState: this.lastState,
        durationInPreviousState: Math.round(duration * 100) / 100,
        ear: metrics.ear || 0,
        mar: metrics.mar || 0,
        yaw: metrics.yaw || 0,
        blinkRate: metrics.blinkRate || 0,
        isTracking: metrics.isTracking || false,
        sessionTime: Math.round((now - this.sessionStart) / 1000),
      };

      this.logs.push(entry);

      // Trim if too many entries
      if (this.logs.length > MAX_ENTRIES) {
        this.logs = this.logs.slice(-MAX_ENTRIES);
      }

      this._saveToStorage();
      this.lastState = state;
      this.stateStartTime = now;

      return entry;
    }
    return null;
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs for current session only
   */
  getSessionLogs() {
    return this.logs.filter(log => log.timestamp >= this.sessionStart);
  }

  /**
   * Get aggregated statistics
   */
  getStats() {
    const sessionLogs = this.getSessionLogs();
    if (sessionLogs.length === 0) {
      return {
        totalEvents: 0,
        drowsyEvents: 0,
        microsleepEvents: 0,
        yawningEvents: 0,
        distractionEvents: 0,
        fatigueEvents: 0,
        alertTime: 0,
        dangerTime: 0,
        safetyScore: 100,
        sessionDuration: 0,
      };
    }

    const drowsyEvents = sessionLogs.filter(l => l.state === 'Drowsy').length;
    const microsleepEvents = sessionLogs.filter(l => l.state === 'Microsleep').length;
    const yawningEvents = sessionLogs.filter(l => l.state === 'Yawning / Distracted').length;
    const distractionEvents = sessionLogs.filter(l => l.state === 'Not Concentrating').length;
    const fatigueEvents = sessionLogs.filter(l => l.state === 'Fatigued').length;

    // Calculate time spent in each state
    let alertTime = 0;
    let dangerTime = 0;
    sessionLogs.forEach(log => {
      if (log.previousState === 'Alert') {
        alertTime += log.durationInPreviousState;
      } else if (['Drowsy', 'Microsleep', 'Not Concentrating'].includes(log.previousState)) {
        dangerTime += log.durationInPreviousState;
      }
    });

    const sessionDuration = (Date.now() - this.sessionStart) / 1000;
    const safetyScore = sessionDuration > 0
      ? Math.max(0, Math.min(100, Math.round((1 - (dangerTime / sessionDuration)) * 100)))
      : 100;

    return {
      totalEvents: sessionLogs.length,
      drowsyEvents,
      microsleepEvents,
      yawningEvents,
      distractionEvents,
      fatigueEvents,
      alertTime: Math.round(alertTime),
      dangerTime: Math.round(dangerTime),
      safetyScore,
      sessionDuration: Math.round(sessionDuration),
    };
  }

  /**
   * Export all logs as CSV and trigger download
   */
  exportToCSV() {
    const headers = [
      'DateTime', 'State', 'AlertLevel', 'PreviousState',
      'DurationInPreviousState(s)', 'EAR', 'MAR', 'YawRatio',
      'BlinkRate', 'FaceTracked', 'SessionTime(s)'
    ];

    const rows = this.logs.map(log => [
      log.dateTime,
      log.state,
      log.alertLevel,
      log.previousState || 'N/A',
      log.durationInPreviousState,
      log.ear,
      log.mar,
      log.yaw,
      log.blinkRate,
      log.isTracking,
      log.sessionTime,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drowsiness_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
    this._saveToStorage();
  }

  /**
   * Reset session
   */
  resetSession() {
    this.sessionStart = Date.now();
    this.lastState = null;
    this.stateStartTime = Date.now();
  }

  // --- Private ---

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // localStorage full — trim older entries
      this.logs = this.logs.slice(-Math.floor(MAX_ENTRIES / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      } catch { /* give up */ }
    }
  }
}

export default DataLogger;
