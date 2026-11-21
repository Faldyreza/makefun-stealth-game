// main.js — game loop + state: title, playing, paused, win, lose.
// Wires level, player, guards, lighting, render, audio, input and HUD.
// Debug stages for screenshots: ?stage=cover | play | nearmiss | win

import { LEVEL, GUARD_POSTS, RELICS, EXIT, PLAYER_SPAWN } from './level.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, guardCone, guardCatches } from './guard.js';
import { lightAt } from './lighting.js';
import { drawScene } from './render.js';
import { drawHUD, drawTitle, drawPaused, drawWin, drawLose } from './hud.js';
import { createInput, consumeEdges } from './input.js';
import * as audio from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const stage = params.get('stage') || '';

function freshState() {
  return {
    mode: 'title',           // title | playing | paused | win | lose
    player: createPlayer(),
    guards: GUARD_POSTS.map((post, i) => createGuard(post, i)),
    relics: RELICS.map((r) => ({ ...r, taken: false })),
    cones: [],
    relicsTaken: 0,
    alarm: 0,
    elapsed: 0,
    startTime: 0,
    timesSpotted: 0,
    closestCall: 'never seen',
    toast: '',
    toastUntil: 0,
    muted: false,
    wasChasing: false,
    wasSuspicious: false,
  };
}

let state = freshState();
const input = createInput();
let lastFrame = performance.now();
let time = 0;

function showToast(text, ms = 2200) {
  state.toast = text;
  state.toastUntil = time + ms;
}

function startGame() {
  state = freshState();
  state.mode = 'playing';
  state.startTime = time;
  audio.ensureAudio();
}

function applyStage() {
  if (!stage) return;
  state.mode = 'playing';
  state.startTime = time - 45000;
  state.elapsed = 45000;
  if (stage === 'cover') {
    state.player.x = 110; state.player.y = LEVEL.groundY;
    state.player.light = 0.12; state.player.hidden = true;
  }
  if (stage === 'play') {
    state.player.x = 500; state.player.y = LEVEL.groundY;
    state.player.sneaking = true;
    state.relics[0].taken = true; state.relicsTaken = 1;
    state.guards[0].x = 420; state.guards[0].dir = -1;
    showToast('Relic stolen: Jade Scarab', 99999);
  }
  if (stage === 'nearmiss') {
    state.player.x = 660; state.player.y = LEVEL.groundY;
    state.guards[1].x = 780; state.guards[1].dir = -1;
    state.guards[1].suspicion = 62; state.guards[1].state = 'pause';
    state.guards[1].lastSeenX = 660; state.guards[1].lastSeenY = LEVEL.groundY;
    state.alarm = 55;
    state.relics[0].taken = true; state.relics[1].taken = true; state.relicsTaken = 2;
    showToast('A guard heard something…', 99999);
  }
  if (stage === 'win') {
    state.mode = 'win';
    state.elapsed = 187000;
    state.timesSpotted = 1;
    state.closestCall = 'a flashlight brushed your cloak';
    state.relics.forEach((r) => { r.taken = true; });
    state.relicsTaken = 3;
    state.player.x = EXIT.x + 20; state.player.y = LEVEL.groundY;
  }
}

function update(dt) {
  const edges = consumeEdges(input);
  if (edges.mutePressed) { state.muted = audio.toggleMute(); }
  if (edges.restartPressed && state.mode !== 'title') { startGame(); return; }

  if (state.mode === 'title') {
    if (input.anyPressed) startGame();
    input.anyPressed = false;
    return;
  }
  if (state.mode === 'paused') {
    if (edges.pausePressed) state.mode = 'playing';
    input.anyPressed = false;
    return;
  }
  if (state.mode === 'win' || state.mode === 'lose') {
    input.anyPressed = false;
    return;
  }

  if (edges.pausePressed) { state.mode = 'paused'; return; }
  state.elapsed = time - state.startTime;

  // Cones first: every system reads the same light this frame.
  state.cones = state.guards.map((g) => guardCone(g, time));

  // Player.
  const p = state.player;
  updatePlayer(p, { ...input, upPressed: edges.upPressed, crawlPressed: edges.crawlPressed }, dt, time);
  p.light = lightAt(p.x, p.y - p.h / 2, state.cones, time);
  p.hidden = p.light <= 0.25;
  if (p.stepped) {
    const nearest = state.guards.reduce((best, g) => Math.min(best, Math.abs(g.x - p.x)), 9999);
    audio.footstep(Math.max(-1, Math.min(1, (state.guards[0].x - p.x) / 400)), p.crawling ? 0.3 : p.sneaking ? 0.5 : 1);
    void nearest;
  }

  // Guards.
  let chasing = false, suspicious = false;
  for (const g of state.guards) {
    updateGuard(g, p, state.cones, time, dt);
    if (g.state === 'chase') chasing = true;
    if (g.suspicion >= 35) suspicious = true;
    if (guardCatches(g, p)) {
      state.mode = 'lose';
      audio.loseMotif();
      return;
    }
  }
  if (chasing && !state.wasChasing) { audio.alarmSting(); state.timesSpotted++; }
  if (suspicious && !state.wasSuspicious) audio.suspiciousTick();
  state.wasChasing = chasing;
  state.wasSuspicious = suspicious;
  state.alarm = Math.max(...state.guards.map((g) => Math.max(g.suspicion, g.alarm)));
  if (state.alarm >= 100) { state.mode = 'lose'; audio.loseMotif(); return; }

  // Relics: step close to steal one.
  for (const r of state.relics) {
    if (!r.taken && Math.abs(p.x - r.x) < 34 && Math.abs(p.y - r.y) < 70) {
      r.taken = true;
      state.relicsTaken++;
      audio.relicChime();
      showToast(`Relic stolen: ${r.name}  (${state.relicsTaken}/3)`);
      if (state.relicsTaken === 3) showToast('All relics stolen — reach the EXIT!', 3200);
    }
  }

  // Exit: win only with all 3 relics.
  if (state.relicsTaken >= 3 && p.x > EXIT.x - 10 && p.x < EXIT.x + EXIT.w + 10
      && p.y > EXIT.y - 10 && p.y < EXIT.y + EXIT.h + 10) {
    state.mode = 'win';
    audio.winMotif();
  }
  input.anyPressed = false;
}

function draw() {
  drawScene(ctx, state, time);
  if (state.mode === 'title') drawTitle(ctx, state);
  else if (state.mode === 'paused') drawPaused(ctx);
  else if (state.mode === 'win') drawWin(ctx, state);
  else if (state.mode === 'lose') drawLose(ctx, state);
  else drawHUD(ctx, state, time);
}

function frame(now) {
  const dt = Math.min(3, Math.max(0.5, (now - lastFrame) / 16.7));
  lastFrame = now;
  time = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

// Boot: apply a screenshot stage if requested, else show the title.
applyStage();
if (stage === 'cover') {
  // Cover: keep the title off, show the full hall alive.
  state.mode = 'playing';
}
requestAnimationFrame(frame);
