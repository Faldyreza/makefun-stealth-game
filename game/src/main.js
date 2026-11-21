// main.js — the game loop, state machine and level flow.
// NIGHT SHIFT: THE GRAND HEIST — three floors, five relics, one night.
// Status: title -> playing <-> paused -> level-clear -> (next floor) -> won,
// or caught at any point. The alarm bar rises while guards chase or cameras
// lock on; at 100 the museum locks down and the run ends.

import { buildLevel, LEVEL_COUNT, totalRelics } from './levels.js';
import { Player } from './player.js';
import { Guard } from './guard.js';
import { SecurityCamera } from './camera.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { drawWorld } from './render.js';
import { drawTopBar, drawControlsHint, drawTitle, drawPaused, drawLevelClear, drawWin, drawCaught } from './hud.js';
import { drawMinimap } from './minimap.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  status: 'title', // title | playing | paused | level-clear | won | caught
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  cameras: [],
  alarm: 0,
  time: 0,
  exitUnlocked: false,
  levelsTaken: [0, 0, 0],
  runRelicsTaken: 0,
  runRelicsTotal: totalRelics(),
  toast: '',
  toastTimer: 0,
  caughtReason: '',
  frozen: false,
  camBeepTimer: 0,
  spots: 0, // times the player has been fully spotted
};

const audio = new SoundEngine();

function showToast(text, seconds = 2.6) {
  state.toast = text;
  state.toastTimer = seconds;
}

/** (Re)build a floor: fresh level, player, guards and cameras. */
function startLevel(index) {
  state.levelIndex = index;
  state.level = buildLevel(index);
  state.player = new Player(state.level.playerSpawn);
  state.guards = state.level.guards.map((cfg) => new Guard(cfg));
  state.cameras = state.level.cameras.map((cfg) => new SecurityCamera(cfg));
  state.alarm = 0;
  state.exitUnlocked = false;
  state.levelsTaken[index] = 0;
  state.runRelicsTaken = state.levelsTaken.reduce((a, b) => a + b, 0);
  state.status = 'playing';
  state.toast = '';
  state.toastTimer = 0;
  showToast(`${state.level.name} — ${state.level.objective}`, 3.2);
}

/** A guard went fully alert: radio the guards nearby to converge. */
function propagateAlert(source) {
  state.spots++;
  audio.alarm();
  showToast('SPOTTED! The guards are converging!', 2.2);
  for (const g of state.guards) {
    if (g === source || g.state === 'alert') continue;
    const d = Math.hypot(g.x - state.player.x, g.y - state.player.y);
    if (d < 340) {
      g.state = 'suspicious';
      g.suspicion = Math.max(g.suspicion, 0.6);
      g.lastSeen = { x: state.player.x, y: state.player.y };
    }
  }
}

function onCaught(guard) {
  if (state.status !== 'playing') return;
  state.status = 'caught';
  state.caughtReason = guard.kind === 'elite'
    ? 'The Elite guard ran you down.'
    : 'A guard got a hand on you.';
  audio.lose();
}

const guardEvents = {
  onAlert: (g) => propagateAlert(g),
  onSuspicion: () => audio.suspicious(),
  onCaught,
};

function update(dt) {
  if (state.status !== 'playing') return;
  state.time += dt;
  state.toastTimer = Math.max(0, state.toastTimer - dt);

  const click = input.takeClick();
  if (click) state.player.moveTarget = click;
  state.player.update(dt, input, state.level);

  // Footsteps: louder as the nearest guard closes in.
  if (state.player.stepped()) {
    let nearest = Infinity;
    for (const g of state.guards) nearest = Math.min(nearest, Math.hypot(g.x - state.player.x, g.y - state.player.y));
    const near = Math.max(0, 1 - nearest / 420);
    audio.footstep(state.player.sneaking, near);
  }

  for (const g of state.guards) g.update(dt, state.player, state.level, guardEvents);
  if (state.status !== 'playing') return; // caught during the guard pass

  // Cameras: a full lock trips the alarm and radios the nearest guard.
  let anyCameraSeeing = false;
  for (const c of state.cameras) {
    c.update(dt, state.player, state.level);
    if (c.seeing) {
      anyCameraSeeing = true;
      state.camBeepTimer -= dt;
      if (state.camBeepTimer <= 0) {
        audio.cameraBeep(c.lock);
        state.camBeepTimer = 0.45;
      }
    }
    if (c.tripped) {
      state.alarm = Math.min(100, state.alarm + 15);
      showToast('CAMERA LOCK! A guard is coming to look.', 2.2);
      let nearest = null;
      let nearestD = Infinity;
      for (const g of state.guards) {
        const d = Math.hypot(g.x - state.player.x, g.y - state.player.y);
        if (d < nearestD) { nearestD = d; nearest = g; }
      }
      if (nearest) {
        nearest.state = 'alert';
        nearest.suspicion = 1;
        nearest.lastSeen = { x: state.player.x, y: state.player.y };
      }
      audio.alarm();
    }
  }

  // Alarm: climbs while anyone chases or a camera watches, cools otherwise.
  const anyAlert = state.guards.some((g) => g.state === 'alert');
  if (anyAlert) state.alarm = Math.min(100, state.alarm + 7 * dt);
  else if (anyCameraSeeing) state.alarm = Math.min(100, state.alarm + 4 * dt);
  else state.alarm = Math.max(0, state.alarm - 2.5 * dt);
  if (state.alarm >= 100) {
    state.status = 'caught';
    state.caughtReason = 'The alarm hit maximum — the museum locked down.';
    audio.lose();
    return;
  }

  // Relic pickup.
  const relic = state.player.tryPickup(state.level);
  if (relic) {
    state.levelsTaken[state.levelIndex]++;
    state.runRelicsTaken = state.levelsTaken.reduce((a, b) => a + b, 0);
    audio.pickup();
    showToast(`Relic secured: ${relic.name}  (${state.runRelicsTaken}/${state.runRelicsTotal})`, 2.6);
  }

  // Fuse box: cutting it kills every camera on the floor.
  if (state.player.tryFuse(state.level)) {
    for (const c of state.cameras) c.disable();
    audio.fuseCut();
    showToast('FUSE CUT — cameras offline', 2.6);
  }

  // Exit: locked until this floor's relics are all taken.
  const taken = state.level.relics.filter((r) => r.taken).length;
  if (!state.exitUnlocked && taken === state.level.relics.length) {
    state.exitUnlocked = true;
    audio.levelClear();
    showToast('EXIT OPEN — get out unseen!', 3);
  }
  if (state.player.atExit(state.level, state.exitUnlocked)) {
    if (state.levelIndex + 1 >= LEVEL_COUNT) {
      state.status = 'won';
      audio.win();
    } else {
      state.status = 'level-clear';
      audio.levelClear();
    }
  }
}

function render(time) {
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, 1280, 720);
  if (state.level) drawWorld(ctx, state, time);
  if (state.status === 'title') {
    drawTitle(ctx);
    return;
  }
  drawTopBar(ctx, state);
  drawMinimap(ctx, state);
  drawControlsHint(ctx);
  if (state.status === 'paused') drawPaused(ctx);
  else if (state.status === 'level-clear') drawLevelClear(ctx, state);
  else if (state.status === 'won') drawWin(ctx, state);
  else if (state.status === 'caught') drawCaught(ctx, state);
}

function handleAction(action) {
  audio.ensure();
  if (action === 'mute') {
    const muted = audio.toggleMute();
    showToast(muted ? 'Sound muted (M to unmute)' : 'Sound on', 1.4);
    return;
  }
  if (action === 'restart') {
    startLevel(state.levelIndex);
    return;
  }
  if (action === 'pause') {
    if (state.status === 'playing') state.status = 'paused';
    else if (state.status === 'paused') state.status = 'playing';
    return;
  }
  if (action === 'enter') {
    if (state.status === 'title') startLevel(0);
    else if (state.status === 'level-clear') startLevel(state.levelIndex + 1);
    else if (state.status === 'won' || state.status === 'caught') startLevel(state.levelIndex);
    return;
  }
  if (action === 'click') {
    if (state.status === 'title') startLevel(0);
    else if (state.status === 'level-clear') startLevel(state.levelIndex + 1);
  }
}

const input = new Input(canvas, handleAction);

// --- screenshot staging ----------------------------------------------------
// ?shot=cover|sneak|alarm|win poses a frozen scene for the screenshots.
// ?level=N&freeze=1 freezes any floor after a few simulated seconds.
// These are renders of the game's own code, posed through its own state.
function stageShot(shot) {
  const sim = (seconds) => {
    const steps = Math.round(seconds / (1 / 60));
    for (let i = 0; i < steps; i++) update(1 / 60);
  };
  if (shot === 'cover') {
    startLevel(0);
    sim(4);
    state.frozen = true;
  } else if (shot === 'sneak') {
    startLevel(1);
    const p = state.player;
    p.x = 310; p.y = 570; p.sneaking = true; p.dir = Math.PI;
    const g = state.guards[1];
    g.x = 310; g.y = 430; g.dir = Math.PI / 2;
    g.state = 'suspicious'; g.suspicion = 0.45;
    g.lastSeen = { x: 310, y: 560 };
    state.cameras[1].lock = 0.35;
    state.toast = 'Stay in the dark — the shelf blocks its cone';
    state.toastTimer = 99;
    state.frozen = true;
  } else if (shot === 'alarm') {
    startLevel(2);
    state.alarm = 78;
    const p = state.player;
    p.x = 640; p.y = 480; p.sneaking = true; p.dir = -Math.PI / 2;
    const spots = [[400, 300], [880, 300], [640, 200], [700, 600], [520, 560]];
    state.guards.forEach((g, i) => {
      g.x = spots[i][0]; g.y = spots[i][1];
      g.state = 'alert'; g.suspicion = 1;
      g.lastSeen = { x: p.x, y: p.y };
      g.dir = Math.atan2(p.y - g.y, p.x - g.x);
    });
    state.toast = 'SPOTTED! Break line of sight — now!';
    state.toastTimer = 99;
    state.frozen = true;
  } else if (shot === 'win') {
    startLevel(2);
    state.level.relics.forEach((r) => { r.taken = true; });
    state.levelsTaken[2] = 1;
    state.levelsTaken[0] = 2;
    state.levelsTaken[1] = 2;
    state.runRelicsTaken = 5;
    state.exitUnlocked = true;
    state.player.x = 640; state.player.y = 640;
    state.player.dir = Math.PI / 2;
    state.time = 245;
    state.status = 'won';
    state.toast = ''; // no level-intro banner over the win screen
    state.toastTimer = 0;
    state.frozen = true;
  }
}

// --- debug hooks for headless verification (not part of play) --------------
window.__game = {
  state,
  startLevel,
  teleport(x, y) { state.player.x = x; state.player.y = y; state.player.moveTarget = null; },
  collectAll() {
    for (const r of state.level.relics) if (!r.taken) { r.taken = true; state.levelsTaken[state.levelIndex]++; }
    state.runRelicsTaken = state.levelsTaken.reduce((a, b) => a + b, 0);
  },
  setAlarm(v) { state.alarm = v; },
  status() { return state.status; },
};

// --- boot -------------------------------------------------------------------
const params = new URLSearchParams(location.search);
startLevel(0);
state.status = 'title';
if (params.get('shot')) {
  stageShot(params.get('shot'));
} else if (params.get('freeze')) {
  const lv = Math.min(LEVEL_COUNT - 1, Math.max(0, parseInt(params.get('level') || '0', 10)));
  startLevel(lv);
  const steps = Math.round(4 / (1 / 60));
  for (let i = 0; i < steps; i++) update(1 / 60);
  state.frozen = true;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
