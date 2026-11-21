// audio.js — all sound synthesized with WebAudio: soft footstep ticks panned
// by guard distance, a low alarm sting, relic chimes, win and lose motifs.
// No audio files, no network.

let ctx = null;
let master = null;
let muted = false;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export function isMuted() { return muted; }

// A short filtered tick: a footstep on stone. pan -1..1 by guard distance.
export function footstep(pan, loud) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180 + Math.random() * 60, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.07);
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.setValueAtTime(0.12 * loud, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  osc.connect(filter); filter.connect(gain);
  if (panner) { panner.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(panner); panner.connect(master); }
  else gain.connect(master);
  osc.start(t); osc.stop(t + 0.1);
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain); gain.connect(master);
  osc.start(t); osc.stop(t + dur + 0.02);
}

// Rising two-note alarm sting when a guard goes "!" and chases.
export function alarmSting() {
  tone(220, 0.25, 'sawtooth', 0.10);
  tone(311, 0.35, 'sawtooth', 0.10, 0.18);
  tone(440, 0.5, 'sawtooth', 0.08, 0.36, 660);
}

// Soft "?" tick when a guard grows suspicious.
export function suspiciousTick() {
  tone(520, 0.12, 'sine', 0.08);
  tone(660, 0.14, 'sine', 0.07, 0.1);
}

// Bright chime when a relic is stolen.
export function relicChime() {
  tone(880, 0.3, 'sine', 0.12);
  tone(1318, 0.45, 'sine', 0.10, 0.09);
}

// Win motif: a small rising arpeggio. Lose motif: a low falling drone.
export function winMotif() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.12, i * 0.13));
}
export function loseMotif() {
  tone(196, 0.8, 'sawtooth', 0.10, 0, 98);
  tone(147, 1.0, 'sawtooth', 0.08, 0.3, 73);
}
