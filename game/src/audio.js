// audio.js — every sound is synthesized with WebAudio: no audio files.
// Footsteps tick softly and get louder as the nearest guard closes in,
// cameras beep while they lock on, and pickups, alarms and wins get jingles.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.hum = null;
    this.humGain = null;
  }

  /** Create the audio context on the first user gesture (browsers require it). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // Quiet room-tone hum under everything.
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 52;
      const g = this.ctx.createGain();
      g.gain.value = 0.018;
      osc.connect(g).connect(this.ctx.destination);
      osc.start();
      this.hum = osc;
      this.humGain = g;
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.humGain) this.humGain.gain.value = this.muted ? 0 : 0.018;
    return this.muted;
  }

  /** Short tone: freq in Hz, dur in seconds, type, volume 0..1. */
  tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** Soft footstep tick. `near` 0..1 is how close the nearest guard is. */
  footstep(sneaking, near) {
    if (!this.ctx || this.muted) return;
    const vol = sneaking ? 0.015 : 0.03 + near * 0.05;
    this.tone(sneaking ? 300 : 170, 0.06, 'triangle', vol, 0, 90);
  }

  /** Camera lock beep; pitch climbs as the lock fills. */
  cameraBeep(lock) {
    this.tone(700 + lock * 500, 0.07, 'square', 0.035);
  }

  /** Guard gets suspicious — a short questioning blip. */
  suspicious() {
    this.tone(520, 0.12, 'sine', 0.07, 0, 780);
  }

  /** Alarm sting: two harsh descending tones. */
  alarm() {
    this.tone(880, 0.22, 'sawtooth', 0.09, 0, 440);
    this.tone(880, 0.22, 'sawtooth', 0.09, 0.24, 440);
  }

  /** Relic pickup: a bright little arpeggio. */
  pickup() {
    this.tone(660, 0.1, 'sine', 0.09);
    this.tone(880, 0.1, 'sine', 0.09, 0.09);
    this.tone(1320, 0.16, 'sine', 0.09, 0.18);
  }

  /** Fuse cut: a spark and a dying hum. */
  fuseCut() {
    this.tone(1200, 0.08, 'square', 0.06, 0, 300);
    this.tone(300, 0.3, 'sawtooth', 0.05, 0.08, 60);
  }

  /** Level clear: a rising fanfare. */
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.09, i * 0.11));
  }

  /** Run won: a longer fanfare. */
  win() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.09, i * 0.12));
  }

  /** Caught: a low falling sting. */
  lose() {
    this.tone(220, 0.5, 'sawtooth', 0.1, 0, 55);
    this.tone(110, 0.7, 'sawtooth', 0.08, 0.15, 40);
  }
}
