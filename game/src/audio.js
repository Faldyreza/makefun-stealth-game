// audio.js — synthesized sound: footsteps, alarms, chimes. No assets.
// One job: make every sound with WebAudio oscillators. The context starts
// only after the player's first input (browsers require a gesture).

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    stepCount: 0,
  };

  audio.ensure = function ensure() {
    if (!audio.ctx) {
      try {
        audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audio.ctx = null;
      }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  };

  function blip(freq, dur, type, gain, when = 0) {
    if (audio.muted) return;
    const ctx = audio.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Soft tick for a footstep; quieter and lower when sneaking.
  audio.footstep = function footstep(sneaking) {
    audio.stepCount++;
    blip(sneaking ? 140 : 190, 0.06, 'sine', sneaking ? 0.03 : 0.07);
  };

  // A rising two-note sting when a guard starts the chase.
  audio.alarm = function alarm() {
    blip(440, 0.16, 'square', 0.06);
    blip(587, 0.22, 'square', 0.06, 0.14);
  };

  // A short questioning blip when a guard first gets suspicious ("?").
  audio.noticed = function noticed() {
    blip(660, 0.1, 'triangle', 0.07);
    blip(520, 0.14, 'triangle', 0.06, 0.1);
  };

  // A bright chime when an artifact is pocketed.
  audio.pickup = function pickup() {
    blip(880, 0.12, 'sine', 0.09);
    blip(1318, 0.2, 'sine', 0.08, 0.09);
  };

  // A warm arpeggio for the win.
  audio.win = function win() {
    [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.25, 'triangle', 0.09, i * 0.12));
  };

  // A low thud for being caught.
  audio.caught = function caught() {
    blip(110, 0.4, 'sawtooth', 0.1);
    blip(82, 0.5, 'sawtooth', 0.1, 0.12);
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    return audio.muted;
  };

  return audio;
}
