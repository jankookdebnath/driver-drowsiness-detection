import React, { useState, useEffect } from 'react';
import { Phone, Send, CheckCircle, XCircle, Loader, Bell, BellRing } from 'lucide-react';

const SMS_STORAGE_KEY = 'drowsiness_sms_config';

export default function TwilioConfig({ onConfigChange }) {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(SMS_STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  })();

  const [phoneNumber, setPhoneNumber] = useState(stored.phoneNumber || '');
  const [enabled, setEnabled] = useState(stored.enabled || false);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(stored.browserNotif || false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [status, setStatus] = useState(null);
  const [lastSent, setLastSent] = useState(stored.lastSent || null);

  const saveConfig = (phone, isEnabled, browserNotif) => {
    const config = { phoneNumber: phone, enabled: isEnabled, browserNotif, lastSent };
    localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(config));
    if (onConfigChange) onConfigChange(config);
  };

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    saveConfig(phoneNumber, newEnabled, browserNotifEnabled);
  };

  const handleBrowserNotifToggle = async () => {
    if (!browserNotifEnabled) {
      // Request permission
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        setBrowserNotifPermission(perm);
        if (perm !== 'granted') return;
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        alert('Browser notifications are blocked. Please enable them in your browser settings.');
        return;
      }
    }
    const newVal = !browserNotifEnabled;
    setBrowserNotifEnabled(newVal);
    saveConfig(phoneNumber, enabled, newVal);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhoneNumber(val);
    saveConfig(val, enabled, browserNotifEnabled);
  };

  const handleTestNotification = async () => {
    setStatus('sending');

    // 1. Always try browser notification
    const browserSent = sendBrowserNotification(
      '🚨 TEST ALERT',
      'Driver Drowsiness Detection System is active and monitoring. This is a test notification.'
    );

    // 2. Try SMS if enabled and phone provided
    let smsSent = false;
    if (enabled && phoneNumber) {
      try {
        const response = await fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phoneNumber,
            message: '🚨 TEST ALERT: Driver Drowsiness Detection System is active. This is a test.',
          }),
        });
        smsSent = response.ok;
      } catch {
        console.warn('SMS not available (local dev mode)');
      }
    }

    if (browserSent || smsSent) {
      setStatus('success');
      setLastSent(new Date().toISOString());
      saveConfig(phoneNumber, enabled, browserNotifEnabled);
    } else {
      setStatus('error');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="twilio-config">
      {/* Browser Notifications (works locally!) */}
      <div className="twilio-header" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <BellRing size={16} color="var(--accent-blue)" />
        <span>Browser Notifications</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={browserNotifEnabled} onChange={handleBrowserNotifToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>
      {browserNotifEnabled && (
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {browserNotifPermission === 'granted' ? (
            <span style={{ color: 'var(--accent-green)' }}>✓ Browser notifications enabled</span>
          ) : browserNotifPermission === 'denied' ? (
            <span style={{ color: 'var(--accent-red)' }}>✗ Blocked — enable in browser settings</span>
          ) : (
            <span style={{ color: 'var(--accent-yellow)' }}>⚠ Click toggle to request permission</span>
          )}
        </div>
      )}

      {/* SMS Notifications */}
      <div className="twilio-header">
        <Phone size={16} color="var(--accent-green)" />
        <span>SMS Emergency Alert</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div className="twilio-body">
          <div className="twilio-input-group">
            <label>Emergency Contact Number</label>
            <div className="twilio-input-row">
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+1234567890"
                className="twilio-input"
              />
            </div>
            <p className="twilio-hint">
              SMS requires Netlify deployment with Twilio env vars configured.
            </p>
          </div>
        </div>
      )}

      {/* Test Button */}
      <div style={{ padding: '0.75rem 1rem' }}>
        <button
          className="btn action-btn"
          onClick={handleTestNotification}
          disabled={status === 'sending'}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {status === 'sending' ? <Loader size={14} className="spin" /> :
           status === 'success' ? <><CheckCircle size={14} color="var(--accent-green)" /> Sent!</> :
           status === 'error' ? <><XCircle size={14} color="var(--accent-red)" /> Failed</> :
           <><Bell size={14} /> Test Notification</>}
        </button>
      </div>

      {lastSent && (
        <p className="twilio-last-sent" style={{ padding: '0 1rem 0.75rem' }}>
          Last sent: {new Date(lastSent).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/**
 * Send a browser push notification
 */
export function sendBrowserNotification(title, body) {
  try {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;

    const stored = JSON.parse(localStorage.getItem(SMS_STORAGE_KEY) || '{}');
    if (!stored.browserNotif) return false;

    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'drowsiness-alert',
      renotify: true,
      requireInteraction: true,
    });
    return true;
  } catch (e) {
    console.warn('Browser notification failed:', e);
    return false;
  }
}

/**
 * Send alert via all available channels (Browser + SMS)
 */
export async function sendAlertNotification(driverState) {
  // 1. Browser notification (always works locally)
  sendBrowserNotification(
    '🔴 CRITICAL: Driver Drowsiness Alert!',
    `"${driverState}" detected! Immediate attention required! Time: ${new Date().toLocaleTimeString()}`
  );

  // 2. SMS via Netlify function (works when deployed)
  try {
    const stored = JSON.parse(localStorage.getItem(SMS_STORAGE_KEY) || '{}');
    if (!stored.enabled || !stored.phoneNumber) return;

    await fetch('/.netlify/functions/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: stored.phoneNumber,
        message: `🚨 CRITICAL ALERT: Driver drowsiness system detected "${driverState}" state! Immediate attention required. Time: ${new Date().toLocaleString()}`,
      }),
    });
  } catch {
    console.warn('SMS alert failed — function may not be available in local dev');
  }
}
