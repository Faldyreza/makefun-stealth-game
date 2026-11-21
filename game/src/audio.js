// audio.js — every sound is synthesized with WebAudio, no audio files.
// Soft footstep ticks whose volume hints at the nearest guard, a rising
// two-tone sting when a guard goes alert, a bright blip on pickup, and
// short win / lose phrases. The context is created lazily on the first
// key press or click, so browsers' autoplay rules never block the page.

let ctx = null;
let muted = false;

function ensureContext() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A soft tap: the player's own step, quieter while sneaking.
export function playStep(sneaking) {
  tone(sneaking ? 140 : 180, 0.07, 'sine', sneaking ? 0.03 : 0.07);
}

// A low thump that grows louder as the nearest guard gets closer.
export function playGuardThump(dist) {
  const vol = Math.max(0.01, 0.12 * (1 - dist / 420));
  tone(70, 0.12, 'sine', vol);
}

// The alarm sting: two rising notes when a guard spots the player.
export function playAlertSting() {
  tone(520, 0.16, 'square', 0.08);
  tone(780, 0.22, 'square', 0.08, 0.14);
}

// A short rising blip when a relic is pocketed.
export function playPickup() {
  tone(660, 0.09, 'sine', 0.09);
  tone(990, 0.14, 'sine', 0.09, 0.08);
}

// A bright little phrase for a clean getaway.
export function playWin() {
  tone(523, 0.14, 'triangle', 0.1);
  tone(659, 0.14, 'triangle', 0.1, 0.13);
  tone(784, 0.2, 'triangle', 0.1, 0.26);
  tone(1046, 0.32, 'triangle', 0.1, 0.39);
}

// A low falling phrase for getting caught.
export function playLose() {
  tone(330, 0.25, 'sawtooth', 0.07);
  tone(220, 0.4, 'sawtooth', 0.07, 0.22, 110);
}
