// main.js — game loop + state: title, playing, paused, win, lose.
// One job: own the frame loop and wire the other files together.

import { screenToTile, tileDist } from './iso.js';
import { ARTIFACTS, EXIT, GUARD_ROUTES } from './level.js';
import { createPlayer, updatePlayer, updateCoverState, resetPlayer, atExit } from './player.js';
import { createGuard, updateGuard } from './guard.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { drawHud, drawOverlay } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();
const input = createInput(canvas);

export const GAME_STATES = ['title', 'playing', 'paused', 'win', 'lose'];

function createGame() {
  return {
    state: 'title',
    time: 0,
    alarm: 0,
    player: createPlayer(),
    guards: GUARD_ROUTES.map((r, i) => createGuard(r, i)),
    artifactsTaken: new Set(),
    loseReason: '',
    winTime: 0,
    lastStep: 0,
    chased: false,
  };
}

let game = createGame();

// Staged scenes for screenshots (?shot=cover|sneak|nearmiss|win):
// the same game code, started from a mid-heist moment. Every scene parks
// the guards (pauseTimer) and points their cones AWAY from the thief, or
// stages a frozen near-miss — so a scene still reads the same a few
// seconds after it loads, instead of decaying into a "CAUGHT!" screen.
function parkGuard(i, x, y, facing, suspicion = 0, state = 'patrol') {
  const g = game.guards[i];
  g.x = x; g.y = y; g.facing = facing;
  g.suspicion = suspicion; g.state = state;
  g.pauseTimer = 8; g.lastSeen = null; g.searchTimer = 0;
}

function applyShot(shot) {
  const p = game.player;
  if (shot === 'cover') {
    // Calm wide shot: the thief sneaks beside a planter while four amber
    // cones sweep the bright floor. Nobody sees anybody.
    game.state = 'playing';
    game.time = 42;
    p.x = 2.6; p.y = 6.2; p.sneaking = true;
    parkGuard(0, 11.5, 2.5, 0.1); // Rosa, far north-east, facing east
    parkGuard(1, 8.5, 5.5, -Math.PI / 2); // Bram, centre, facing north
    parkGuard(2, 1.5, 6.5, Math.PI); // Ines, west wall, facing west
    parkGuard(3, 12.5, 6.5, Math.PI / 2); // Tomas, east wall, facing south
  } else if (shot === 'sneak') {
    // Mid-sneak: Bram has a "?" and his amber cone sweeps just past the
    // thief crouched by the statue. Re-stage right before the shot.
    game.state = 'playing';
    game.time = 75;
    p.x = 4.6; p.y = 5.2; p.sneaking = true;
    parkGuard(1, 7.5, 5.5, -2.25, 0.45, 'suspicious');
    parkGuard(0, 11.5, 2.5, Math.PI / 2);
    parkGuard(2, 1.5, 12.5, 0);
    parkGuard(3, 12.5, 1.5, Math.PI / 2);
  } else if (shot === 'nearmiss') {
    // Near-miss: Rosa is ON the thief, red cone, "!", alarm half full.
    // Staged fresh just before the shutter — a chasing guard would
    // otherwise close the gap in under a second.
    game.state = 'playing';
    game.time = 110;
    p.x = 8.2; p.y = 9.2;
    parkGuard(0, 9.6, 8.2, Math.atan2(1, 0.4), 0.92, 'chase');
    game.guards[0].lastSeen = { x: p.x, y: p.y };
    parkGuard(1, 5.5, 5.5, 0);
    parkGuard(2, 1.5, 6.5, 0);
    parkGuard(3, 12.5, 1.5, Math.PI / 2);
    game.alarm = 0.45;
    game.artifactsTaken = new Set(['sun', 'falcon']);
    game.player.artifacts = 2;
  } else if (shot === 'win') {
    game.state = 'win';
    game.winTime = 187;
    game.artifactsTaken = new Set(['sun', 'falcon', 'scarab']);
    game.player.artifacts = 3;
    p.x = EXIT.x; p.y = EXIT.y;
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) applyShot(shot);

function restart() {
  game = createGame();
  game.state = 'playing';
  if (shot) applyShot(shot);
}

function update(dt) {
  if (game.state !== 'playing') return;
  game.time += dt;
  const dir = input.direction();
  const click = input.consumeClick();
  if (click) {
    const t = screenToTile(click.sx, click.sy);
    game.player.clickTarget = { x: t.x, y: t.y };
    audio.ensure();
  }
  if (dir.x !== 0 || dir.y !== 0) game.player.clickTarget = null;
  const moved = updatePlayer(game.player, dir, dt, input.sneak);
  updateCoverState(game.player);
  // Footstep ticks, timed by distance walked.
  if (moved && game.time - game.lastStep > (game.player.sneaking ? 0.55 : 0.34)) {
    game.lastStep = game.time;
    audio.footstep(game.player.sneaking);
  }
  // Artifact pickup.
  for (const a of ARTIFACTS) {
    if (!game.artifactsTaken.has(a.id) &&
        tileDist(game.player.x, game.player.y, a.x + 0.5, a.y + 0.5) < 0.75) {
      game.artifactsTaken.add(a.id);
      game.player.artifacts = game.artifactsTaken.size;
      audio.pickup();
    }
  }
  // Guards. A guard crossing into "?" plays a questioning blip once.
  let anyChase = false;
  for (const g of game.guards) {
    const wasSuspicious = g.suspicion >= 0.35;
    const result = updateGuard(g, game.player, dt, game.time);
    if (!wasSuspicious && g.suspicion >= 0.35 && g.state !== 'chase') audio.noticed();
    if (g.state === 'chase') anyChase = true;
    if (result === 'caught') {
      game.state = 'lose';
      game.loseReason = `Caught by ${g.name} the guard!`;
      audio.caught();
      return;
    }
  }
  if (anyChase && !game.chased) audio.alarm();
  game.chased = anyChase;
  // Alarm fills while chased, drains when hidden; full alarm ends the run.
  game.alarm += (anyChase ? 0.12 : -0.2) * dt;
  game.alarm = Math.max(0, Math.min(1, game.alarm));
  if (game.alarm >= 1) {
    game.state = 'lose';
    game.loseReason = 'The alarm maxed out — the museum is locked down!';
    audio.caught();
    return;
  }
  // Win: all three artifacts, then step onto the green exit.
  if (game.artifactsTaken.size >= 3 && atExit(game.player)) {
    game.state = 'win';
    game.winTime = game.time;
    audio.win();
  }
}

function draw() {
  render(ctx, {
    player: game.player,
    guards: game.guards,
    artifactsTaken: game.artifactsTaken,
    time: game.time,
  });
  if (game.state === 'playing' || game.state === 'paused') {
    drawHud(ctx, { player: game.player, guards: game.guards, time: game.time, alarm: game.alarm });
  }
  if (game.state === 'title') {
    drawOverlay(ctx, 'DAYLIGHT HEIST', [
      'Steal the Sun Disk, the Jade Falcon and the Golden Scarab,',
      'then slip out the green EXIT — unseen.',
      'Amber cones are guard eyesight. Planters, statues, crates and',
      'columns break their line of sight. Sneak (Shift) to stay quiet.',
      'Press ENTER or click the atrium to begin.',
    ], '#b45309');
  } else if (game.state === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['Press P to keep sneaking.', 'R restarts the heist.'], '#1d2a4a');
  } else if (game.state === 'win') {
    drawOverlay(ctx, 'CLEAN GETAWAY!', [
      `All 3 artifacts stolen in ${Math.floor(game.winTime / 60)}:${String(Math.floor(game.winTime % 60)).padStart(2, '0')}.`,
      'The atrium never knew you were there.',
      'Press R to run it again.',
    ], '#16a34a');
  } else if (game.state === 'lose') {
    drawOverlay(ctx, 'CAUGHT!', [
      game.loseReason,
      `${game.artifactsTaken.size} of 3 artifacts stolen.`,
      'Press R to try the heist again.',
    ], '#dc2626');
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.wasPressed('Enter') && game.state === 'title') {
    game.state = 'playing';
    audio.ensure();
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (game.state === 'playing' || game.state === 'paused') {
      game.state = game.state === 'playing' ? 'paused' : 'playing';
    }
  }
  if (input.wasPressed('KeyR') && game.state !== 'title') restart();
  if (input.wasPressed('KeyM')) audio.toggleMute();
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

// Test hook for headless play-testing: read state, drive the player, and
// stage scenarios without touching the mouse or keyboard.
window.__game = {
  get state() { return game.state; },
  get time() { return game.time; },
  get alarm() { return game.alarm; },
  get player() { return game.player; },
  get guards() { return game.guards; },
  get artifactsTaken() { return game.artifactsTaken; },
  start() { game.state = 'playing'; audio.ensure(); },
  restart,
  // Re-stage a screenshot scene on demand (used right before the shutter
  // so a chase scene cannot decay into a "CAUGHT!" screen first).
  stageShot(name) { applyShot(name); },
  teleport(x, y) { game.player.x = x; game.player.y = y; game.player.clickTarget = null; },
  collectAll() {
    for (const a of ARTIFACTS) game.artifactsTaken.add(a.id);
    game.player.artifacts = 3;
  },
};

requestAnimationFrame(frame);
