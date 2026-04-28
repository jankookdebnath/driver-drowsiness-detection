/**
 * AlertManager — Multi-Level Alert Audio System
 * Level 1 (Warning): Soft sine wave beeps
 * Level 2 (Danger): Loud square wave siren
 * Level 3 (Critical): Continuous alarm + Text-to-Speech "WAKE UP!"
 */

export class AlertManager {
  constructor() {
    this.audioCtx = null;
    this.currentLevel = 0;
    this.intervalId = null;
    this.ttsTimeout = null;
    this.smsCallback = null;
    this.smsCooldown = false;
    this.SMS_COOLDOWN_MS = 60000; // 1 minute cooldown between SMS
  }

  /**
   * Initialize AudioContext (must be called after user gesture)
   */
  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Set SMS callback for Level 3 alerts
   */
  setSMSCallback(callback) {
    this.smsCallback = callback;
  }

  /**
   * Determine alert level from driver state
   */
  static getAlertLevel(driverState) {
    switch (driverState) {
      case 'Alert':
        return 0; // No alert
      case 'Fatigued':
      case 'Yawning / Distracted':
        return 1; // Warning
      case 'Drowsy':
      case 'Not Concentrating':
        return 2; // Danger
      case 'Microsleep':
        return 3; // Critical
      case 'Warning':
        return 1; // Face lost
      default:
        return 0;
    }
  }

  /**
   * Update alert level and manage audio
   */
  update(driverState) {
    const newLevel = AlertManager.getAlertLevel(driverState);

    if (newLevel === this.currentLevel) return;

    this.stop(); // Stop previous alert
    this.currentLevel = newLevel;

    if (newLevel === 0) return;

    this.init();

    switch (newLevel) {
      case 1:
        this._playLevel1();
        this.intervalId = setInterval(() => this._playLevel1(), 3000);
        break;
      case 2:
        this._playLevel2();
        this.intervalId = setInterval(() => this._playLevel2(), 1200);
        break;
      case 3:
        this._playLevel3();
        this.intervalId = setInterval(() => this._playLevel3(), 800);
        this._speakWarning();
        this.ttsTimeout = setInterval(() => this._speakWarning(), 5000);
        this._triggerSMS(driverState);
        break;
    }
  }

  /**
   * Stop all alerts
   */
  stop() {
    this.currentLevel = 0;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ttsTimeout) {
      clearInterval(this.ttsTimeout);
      this.ttsTimeout = null;
    }
    window.speechSynthesis?.cancel();
  }

  /**
   * Level 1 — Soft warning beep (gentle sine wave)
   */
  _playLevel1() {
    if (!this.audioCtx) return;
    try {
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 0.15;
      gainNode.connect(this.audioCtx.destination);

      for (let i = 0; i < 2; i++) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.connect(gainNode);
        const t = this.audioCtx.currentTime + i * 0.2;
        osc.start(t);
        osc.stop(t + 0.12);
      }
    } catch (e) {
      console.error('Level 1 audio error:', e);
    }
  }

  /**
   * Level 2 — Loud siren (square wave alternating pitch)
   */
  _playLevel2() {
    if (!this.audioCtx) return;
    try {
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 1.5;
      gainNode.connect(this.audioCtx.destination);

      for (let i = 0; i < 4; i++) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = i % 2 === 0 ? 1800 : 2400;
        osc.connect(gainNode);
        const t = this.audioCtx.currentTime + i * 0.12;
        osc.start(t);
        osc.stop(t + 0.1);
      }
    } catch (e) {
      console.error('Level 2 audio error:', e);
    }
  }

  /**
   * Level 3 — Piercing continuous alarm
   */
  _playLevel3() {
    if (!this.audioCtx) return;
    try {
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 3.0;
      gainNode.connect(this.audioCtx.destination);

      for (let i = 0; i < 8; i++) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = i % 2 === 0 ? 2500 : 3500;
        osc.connect(gainNode);
        const t = this.audioCtx.currentTime + i * 0.08;
        osc.start(t);
        osc.stop(t + 0.06);
      }
    } catch (e) {
      console.error('Level 3 audio error:', e);
    }
  }

  /**
   * Text-to-Speech warning
   */
  _speakWarning() {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('WAKE UP! You are falling asleep!');
        utterance.rate = 1.3;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('TTS error:', e);
    }
  }

  /**
   * Trigger SMS notification via Netlify function
   */
  _triggerSMS(driverState) {
    if (this.smsCooldown || !this.smsCallback) return;

    this.smsCooldown = true;
    this.smsCallback(driverState);

    setTimeout(() => {
      this.smsCooldown = false;
    }, this.SMS_COOLDOWN_MS);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export default AlertManager;
