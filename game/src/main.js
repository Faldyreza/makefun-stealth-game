// main.js — the game loop and state machine for NIGHT SHIFT: THE ARCHIVE.
// States: title -> playing <-> paused -> win / lose. The loop runs the guards,
// the alarm, key pickup and the exit, and hands drawing to render.js and the
// DOM overlay to hud.js. A ?scene= parameter stages a fixed moment of the game
// (cover / play / alarm / win) so screenshots show the game at its best.

import { SoundEngine } from './audio.js';
import { Guard } from './guard.js';
import { Hud, formatTime } from './hud.js';
import { Input } from './input.js';
import { KEY_SPOTS, PATROLS } from './level.js';
import { Player } from './player.js';
import { drawGame } from './render.js';

// The alarm fills while any guard chases, drains otherwise. Full alarm = caught.
const ALARM_RISE = 0.22;
const ALARM_FALL = 0.12;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = new Hud();
const input = new Input();
const sound = new SoundEngine();

const state = {
  screen: 'title', // title | playing | paused | win | lose
  time: 0,
  alarm: 0,
  alarmsRaised: 0,
  nearMisses: 0,
  player: new Player(),
  guards: PATROLS.map((route, i) => new Guard(route, i)),
  keys: KEY_SPOTS.map((k) => ({ ...k, taken: false })),
  exitAnnounced: false,
  loseReason: '',
};

function resetGame() {
  state.time = 0;
  state.alarm = 0;
  state.alarmsRaised = 0;
  state.nearMisses = 0;
  state.staged = false;
  state.guardStepTimer = 0;
  state.player = new Player();
  state.guards = PATROLS.map((route, i) => new Guard(route, i));
  state.keys = KEY_SPOTS.map((k) => ({ ...k, taken: false }));
  state.exitAnnounced = false;
  state.loseReason = '';
}

function startGame() {
  sound.ensure();
  sound.click();
  resetGame();
  state.screen = 'playing';
  hud.showGame();
  hud.toast('Stay out of the yellow cones. Dark floor is safe.');
}

function showTitle() {
  state.screen = 'title';
  resetGame();
  hud.showTitle();
}

function endGame(won, reason) {
  state.screen = won ? 'win' : 'lose';
  const stats = `⏱ ${formatTime(state.time)}  ·  📜 ${state.player.keys}/3 documents  ·  🚨 alarms raised: ${state.alarmsRaised}  ·  😰 near misses: ${state.nearMisses}`;
  if (won) {
    sound.winJingle();
    hud.showWin(stats);
  } else {
    sound.loseJingle();
    state.loseReason = reason;
    hud.showLose(stats, reason);
  }
}

function onGuardAlarm(guard) {
  state.alarmsRaised += 1;
  sound.alarmSting();
  hud.toast('🚨 SPOTTED! Break line of sight — hide!', 2600);
}

function onPlayerStep(sneaking, x, y) {
  // The player's own step is a quiet tick; the nearest guard's steps are
  // panned by direction so the player hears where the patrol is.
  sound.footstep(sneaking, 0, 0.6);
}

// --- screenshot staging -----------------------------------------------------
// ?scene=cover|play|alarm|win jumps the game to a fixed, readable moment.
// The scene is built from the game's own state — no borrowed imagery.
function stageScene(name) {
  resetGame();
  state.screen = 'playing';
  hud.showGame();
  if (name === 'cover') {
    // Opening frame: thief at the entrance, guards mid-patrol, exit glowing.
    state.player.x = 96;
    state.player.y = 640;
    state.player.facing = -Math.PI / 2;
    // Put two guards where their cones cross the open floor.
    state.guards[0].x = 520;
    state.guards[0].y = 350;
    state.guards[0].angle = 0;
    state.guards[1].x = 1060;
    state.guards[1].y = 300;
    state.guards[1].angle = Math.PI;
    state.guards[2].x = 300;
    state.guards[2].y = 360;
    state.guards[2].angle = -Math.PI / 2;
    state.guards[3].x = 760;
    state.guards[3].y = 640;
    state.guards[3].angle = Math.PI;
    state.time = 12;
  } else if (name === 'play') {
    // Mid-sneak: crouched behind the crates, a cone sweeping past, meter half full.
    state.player.x = 612;
    state.player.y = 440;
    state.player.sneaking = true;
    state.player.facing = Math.PI;
    state.player.moving = true;
    state.keys[0].taken = true;
    state.player.keys = 1;
    state.guards[0].x = 700;
    state.guards[0].y = 350;
    state.guards[0].angle = Math.PI * 0.78;
    state.guards[0].suspicion = 0.55;
    state.guards[0].state = 'suspicious';
    state.guards[0].lastSeen = { x: 612, y: 440 };
    state.guards[1].x = 960;
    state.guards[1].y = 470;
    state.guards[1].angle = -Math.PI / 2;
    state.time = 47;
  } else if (name === 'alarm') {
    // Near-miss: a guard is investigating the shadow the thief hides in.
    state.player.x = 950;
    state.player.y = 560;
    state.player.sneaking = true;
    state.player.facing = Math.PI / 2;
    state.player.moving = true;
    state.keys[0].taken = true;
    state.keys[1].taken = true;
    state.player.keys = 2;
    state.alarm = 0.62;
    state.alarmsRaised = 1;
    state.nearMisses = 1;
    state.guards[1].x = 960;
    state.guards[1].y = 470;
    state.guards[1].angle = Math.PI / 2;
    state.guards[1].suspicion = 0.82;
    state.guards[1].state = 'investigate';
    state.guards[1].lastSeen = { x: 950, y: 540 };
    state.guards[0].x = 700;
    state.guards[0].y = 580;
    state.guards[0].angle = Math.PI / 2;
    state.guards[0].suspicion = 0.3;
    state.time = 96;
  } else if (name === 'win') {
    // All three documents held, thief at the open exit — the win screen.
    state.keys.forEach((k) => (k.taken = true));
    state.player.keys = 3;
    state.player.x = 1215;
    state.player.y = 355;
    state.player.facing = 0;
    state.time = 154;
    state.alarmsRaised = 1;
    state.nearMisses = 2;
    endGame(true);
    hud.update(state);
    return;
  }
  // The staged moment is frozen, so push the HUD once by hand.
  hud.update(state);
  // Freeze the staged moment: guards hold their pose for the screenshot.
  state.staged = true;
}

function update(dt) {
  if (state.screen !== 'playing') return;
  state.time += dt;

  // --- player ---
  state.player.update(dt, input, onPlayerStep);

  // --- guards hear footsteps, then act ---
  for (const noise of state.player.noiseEvents) {
    for (const g of state.guards) g.hearNoise(noise);
  }
  let anyChasing = false;
  for (const g of state.guards) {
    g.update(dt, state.player, onGuardAlarm);
    if (g.state === 'chase') anyChasing = true;
    if (g.caughtPlayer(state.player)) {
      endGame(false, 'A guard grabbed you in the open. Next time, wait for the cone to sweep past — or sneak through the dark.');
      return;
    }
  }
  // A near miss is a suspicion spike that cooled off without an alarm.
  for (const g of state.guards) {
    if (g.suspicion > 0.85 && g.state !== 'chase' && !g.countedNearMiss) {
      g.countedNearMiss = true;
      state.nearMisses += 1;
    }
    if (g.suspicion < 0.2) g.countedNearMiss = false;
  }

  // --- alarm level ---
  state.alarm = Math.max(
    0,
    Math.min(1, state.alarm + (anyChasing ? ALARM_RISE : -ALARM_FALL) * dt),
  );
  if (state.alarm >= 1) {
    endGame(false, 'The alarm hit maximum and the whole museum locked down. Break line of sight sooner — a full meter is a chase, and a chase feeds the alarm.');
    return;
  }

  // --- keys + exit ---
  const got = state.player.tryCollect(state.keys);
  if (got) {
    sound.pickup();
    hud.toast(`📜 ${got} secured — ${state.player.keys}/3 documents`, 2400);
    if (state.player.keys >= KEY_SPOTS.length) {
      sound.exitOpen();
      hud.toast('🔓 All documents held — the EXIT is open. Go!', 3000);
      state.exitAnnounced = true;
    }
  }
  if (state.player.atExit()) {
    endGame(true);
    return;
  }

  // --- guard footsteps: the nearest guard's boots, panned by direction ---
  state.guardStepTimer = (state.guardStepTimer || 0) - dt;
  if (state.guardStepTimer <= 0) {
    state.guardStepTimer = 0.55;
    let nearest = null;
    let nearestDist = Infinity;
    for (const g of state.guards) {
      const d = Math.hypot(g.x - state.player.x, g.y - state.player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = g;
      }
    }
    if (nearest) {
      const pan = Math.max(-1, Math.min(1, (nearest.x - state.player.x) / 300));
      sound.guardStep(pan, nearestDist);
    }
  }

  hud.update(state);
}

function render() {
  drawGame(ctx, state);
}

// --- main loop ---
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (state.screen === 'playing') {
      state.screen = 'paused';
      hud.showPause(true);
      sound.click();
    } else if (state.screen === 'paused') {
      state.screen = 'playing';
      hud.showPause(false);
      sound.click();
    }
  }
  if (input.wasPressed('KeyR') && (state.screen === 'playing' || state.screen === 'win' || state.screen === 'lose')) {
    startGame();
  }
  if (input.wasPressed('KeyM')) {
    const muted = sound.toggleMute();
    hud.toast(muted ? '🔇 Sound muted' : '🔊 Sound on', 1200);
  }
  if (input.wasPressed('Enter') && state.screen === 'title') startGame();

  if (!state.staged) update(dt);
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// --- wiring ---
document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnAgainWin').addEventListener('click', startGame);
document.getElementById('btnAgainWin2').addEventListener('click', showTitle);
document.getElementById('btnAgainLose').addEventListener('click', startGame);
document.getElementById('btnAgainLose2').addEventListener('click', showTitle);
document.getElementById('btnResume').addEventListener('click', () => {
  state.screen = 'playing';
  hud.showPause(false);
  sound.click();
});

// A staged scene from the URL (?scene=cover) renders its moment at once;
// otherwise the title screen waits for the player.
const scene = new URLSearchParams(window.location.search).get('scene');
if (scene) {
  stageScene(scene);
} else {
  hud.showTitle();
}
window.__nightShift = state; // handy handle for play-testing in the console
requestAnimationFrame(frame);
