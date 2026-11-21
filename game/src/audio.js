// audio.js — every sound is synthesized with WebAudio: no audio files, no network.
// Footsteps are soft ticks whose pan hints at where the guard is; the alarm is a
// two-tone sting; pickups and the win/lose jingles are short note runs.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Browsers only allow audio after a user gesture — call from a click handler.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short filtered noise tick — a footstep on the archive floor.
  footstep(sneak, pan = 0, volume = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sneak ? 500 : 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(sneak ? 0.10 * volume : 0.22 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(filter).connect(gain).connect(panner).connect(this.master);
    src.start(t);
  }

  // A guard's distant boot-fall, panned by where the nearest guard stands.
  guardStep(pan, distance) {
    if (!this.ctx || this.muted) return;
    const volume = Math.max(0, 1 - distance / 420);
    if (volume < 0.08) return;
    this.footstep(false, pan, volume * 0.7);
  }

  // Two-tone alarm sting when a guard spots the player fully.
  alarmSting() {
    if (!this.ctx || this.muted) return;
    this.tone(660, 0.14, 'square', 0.16);
    setTimeout(() => this.tone(440, 0.22, 'square', 0.16), 140);
  }

  // A soft chime when a document is picked up.
  pickup() {
    if (!this.ctx || this.muted) return;
    this.tone(880, 0.12, 'sine', 0.18);
    setTimeout(() => this.tone(1318, 0.18, 'sine', 0.16), 90);
  }

  // The exit clicks open.
  exitOpen() {
    if (!this.ctx || this.muted) return;
    this.tone(523, 0.1, 'triangle', 0.15);
    setTimeout(() => this.tone(784, 0.16, 'triangle', 0.15), 100);
  }

  winJingle() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.18), i * 130),
    );
  }

  loseJingle() {
    if (!this.ctx || this.muted) return;
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.1), i * 150),
    );
  }

  click() {
    if (!this.ctx || this.muted) return;
    this.tone(1200, 0.05, 'sine', 0.12);
  }

  tone(freq, dur, type, volume) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
