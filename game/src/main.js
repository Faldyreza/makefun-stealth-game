// main.js — the game loop and the state machine.
// One frame: read input, move the player, update every guard's suspicion,
// raise or cool the alarm, collect relics, check the exit, then draw the
// level, the guards and the HUD. The window.__game handle exposes the
// live state for testing and for staging screenshots.

import { buildLevel, WORLD_W, WORLD_H } from './level.js';
import { createPlayer, updatePlayer, collectRelics, relicsCollected, playerAtExit } from './player.js';
import { createGuard, updateGuard, SUSPICIOUS_AT } from './guard.js';
import { renderGame } from './render.js';
import { drawHud } from './hud.js';
import { createInput } from './input.js';
import {
  unlockAudio, setMuted, isMuted,
  playStep, playGuardThump, playAlertSting, playPickup, playWin, playLose,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const level = buildLevel();
let player = createPlayer(level);
let guards = level.guardDefs.map(createGuard);

const state = {
  phase: 'playing', // playing | paused | won | lost
  elapsed: 0,
  alarm: 0,
  relicsGot: 0,
  loseReason: '',
  frozen: false, // debug: render without advancing the simulation
};

const input = createInput(canvas);
let now = 0;
let lastTs = performance.now();
let thumpTimer = 0;

function resetRun() {
  const fresh = buildLevel();
  // Swap the fresh level's contents into the shared level object so every
  // module keeps working on the same reference.
  for (const key of Object.keys(fresh)) level[key] = fresh[key];
  player = createPlayer(level);
  guards = level.guardDefs.map(createGuard);
  state.phase = 'playing';
  state.elapsed = 0;
  state.alarm = 0;
  state.relicsGot = 0;
  state.loseReason = '';
}

function nearestGuardDistance() {
  let best = Infinity;
  for (const g of guards) {
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    if (d < best) best = d;
  }
  return best;
}

function onGuardAlert(guard) {
  playAlertSting();
}

function update(dt) {
  if (state.phase === 'paused') return;
  if (state.phase === 'won' || state.phase === 'lost') return;
  state.elapsed += dt;
  now += dt;

  // Input: pause / restart / mute are edge-triggered.
  if (input.pausePressed) {
    input.pausePressed = false;
    state.phase = 'paused';
    return;
  }
  if (input.restartPressed) {
    input.restartPressed = false;
    resetRun();
    return;
  }
  if (input.mutePressed) {
    input.mutePressed = false;
    setMuted(!isMuted());
  }
  if (input.click) {
    player.clickTarget = { x: input.click.x, y: input.click.y };
    input.click = null;
    unlockAudio();
  }
  if (input.up || input.down || input.left || input.right) unlockAudio();

  updatePlayer(player, level, input, dt);
  if (player.stepDue) {
    player.stepDue = false;
    playStep(player.sneaking);
  }

  let anyAlert = false;
  for (const guard of guards) {
    updateGuard(guard, level, player, now, dt, onGuardAlert);
    if (guard.mode === 'chase') anyAlert = true;
  }

  // The alarm climbs while any guard chases, and cools when none does.
  if (anyAlert) state.alarm = Math.min(1, state.alarm + 0.12 * dt);
  else state.alarm = Math.max(0, state.alarm - 0.05 * dt);

  // A guard's thump hints at how close the nearest guard is.
  thumpTimer -= dt;
  if (thumpTimer <= 0) {
    thumpTimer = 0.6;
    const d = nearestGuardDistance();
    if (d < 420) playGuardThump(d);
  }

  // Relics.
  const got = collectRelics(player, level);
  if (got) {
    state.relicsGot = relicsCollected(level);
    playPickup();
    if (state.relicsGot >= 5) level.exit.locked = false;
  }

  // Exit: locked until all five relics are pocketed.
  if (!level.exit.locked && playerAtExit(player, level)) {
    state.phase = 'won';
    playWin();
    return;
  }

  // Caught: a chasing guard touches the player, or the alarm maxes out.
  for (const guard of guards) {
    if (guard.mode === 'chase' && Math.hypot(guard.x - player.x, guard.y - player.y) < 26) {
      state.phase = 'lost';
      state.loseReason = guard.name + ' caught you in the open.';
      playLose();
      return;
    }
  }
  if (state.alarm >= 1) {
    state.phase = 'lost';
    state.loseReason = 'The alarm hit maximum — the museum locked down.';
    playLose();
  }
}

function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (!state.frozen) {
    if (state.phase === 'paused' && input.pausePressed) {
      input.pausePressed = false;
      state.phase = 'playing';
    } else if ((state.phase === 'won' || state.phase === 'lost') && input.restartPressed) {
      input.restartPressed = false;
      resetRun();
    } else {
      update(dt);
    }
  }
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  renderGame(ctx, level, player, guards, now);
  drawHud(ctx, level, player, guards, state);
  requestAnimationFrame(frame);
}

// ---- debug handle: live state for play-testing and screenshot staging ----
window.__game = {
  state,
  level,
  get player() { return player; },
  get guards() { return guards; },
  teleport(x, y) { player.x = x; player.y = y; player.clickTarget = null; },
  setSuspicion(i, v) { guards[i].suspicion = v; },
  forceStage(i, stage) {
    const g = guards[i];
    if (stage === 'alert') { g.mode = 'chase'; g.suspicion = 1; g.lastSeen = { x: player.x, y: player.y }; }
    else if (stage === 'suspicious') { g.mode = 'investigate'; g.suspicion = 0.6; g.lastSeen = { x: player.x, y: player.y }; }
    else { g.mode = 'patrol'; g.suspicion = 0; }
  },
  setAlarm(v) { state.alarm = v; },
  giveRelics(n) {
    let given = 0;
    for (const r of level.relics) {
      if (given >= n) break;
      if (!r.taken) { r.taken = true; given++; }
    }
    state.relicsGot = relicsCollected(level);
    if (state.relicsGot >= 5) level.exit.locked = false;
  },
  winNow() { state.phase = 'won'; },
  freeze() { state.frozen = true; },
  unfreeze() { state.frozen = false; },
  restart() { resetRun(); },
};

requestAnimationFrame(frame);
