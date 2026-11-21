// player.js — the thief: isometric movement, sneak, cover state.
// One job: move the player and say how hidden they are. No rendering,
// no guard logic — just the thief's body and senses.

import { clampToFloor, tileDist } from './iso.js';
import { coverAt, pedestalAt, isBalconyTile, EXIT, PLAYER_START } from './level.js';

export const WALK_SPEED = 3.4; // tiles per second, upright
export const SNEAK_SPEED = 1.8; // tiles per second, crouched and quiet
export const PLAYER_RADIUS = 0.34;

export function createPlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    z: 0, // height above floor (balcony lift, lerped)
    facing: -Math.PI / 2, // screen-space angle the thief faces
    sneaking: false,
    moving: false,
    clickTarget: null, // {x, y} tile target from a mouse click
    stepPhase: 0, // advances with distance walked, drives footstep ticks
    hidden: false, // behind cover from every guard's point of view
    onBalcony: false,
    artifacts: 0,
    collected: new Set(),
  };
}

export function resetPlayer(p) {
  const fresh = createPlayer();
  Object.assign(p, fresh, { collected: new Set() });
}

// Try to step to (nx, ny): blocked by cover discs, pedestals and walls.
// Slides along an obstacle when only one axis is blocked.
function tryMove(p, nx, ny) {
  const blocked = (x, y) => coverAt(x, y) !== null || pedestalAt(x, y) !== null;
  const c = clampToFloor(nx, ny, 0.55);
  nx = c.x;
  ny = c.y;
  if (!blocked(nx, ny)) { p.x = nx; p.y = ny; return true; }
  if (!blocked(nx, p.y)) { p.x = nx; return true; }
  if (!blocked(p.x, ny)) { p.y = ny; return true; }
  return false;
}

// dir: {x, y} unit-ish tile direction from keys (may be zero).
// dt in seconds. Returns distance walked this frame.
export function updatePlayer(p, dir, dt, sneakHeld) {
  p.sneaking = sneakHeld && (dir.x !== 0 || dir.y !== 0 || p.clickTarget !== null);
  let mx = dir.x;
  let my = dir.y;
  if ((mx === 0 && my === 0) && p.clickTarget) {
    const dx = p.clickTarget.x - p.x;
    const dy = p.clickTarget.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.12) {
      p.clickTarget = null;
    } else {
      mx = dx / d;
      my = dy / d;
    }
  }
  const len = Math.hypot(mx, my);
  p.moving = len > 0.01;
  if (p.moving) {
    const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const step = (speed * dt) / len;
    const ox = p.x;
    const oy = p.y;
    tryMove(p, p.x + mx * step, p.y + my * step);
    const moved = tileDist(ox, oy, p.x, p.y);
    p.stepPhase += moved * 2.4;
    // Face the direction of travel in screen space: in iso, moving
    // (+dx, +dy) in tile space points down-screen, (-dx, +dy) left.
    const sx = (p.x - ox) - (p.y - oy);
    const sy = (p.x - ox) + (p.y - oy);
    if (sx !== 0 || sy !== 0) p.facing = Math.atan2(sy, sx);
  }
  // Balcony lift: smooth step up/down when crossing the balcony edge.
  const wantZ = isBalconyTile(Math.floor(p.x), Math.floor(p.y)) ? 30 : 0;
  p.z += (wantZ - p.z) * Math.min(1, dt * 6);
  p.onBalcony = p.z > 15;
  return p.moving;
}

// The thief counts as behind cover when a cover object stands within one
// tile — crouched beside a planter or statue, hard to spot at a glance.
export function updateCoverState(p) {
  let near = false;
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      if (coverAt(p.x + dx * 0.5, p.y + dy * 0.5)) { near = true; break; }
    }
    if (near) break;
  }
  p.hidden = near && p.sneaking;
  return p.hidden;
}

// True when the thief stands on the exit pad with all artifacts in hand.
export function atExit(p) {
  return tileDist(p.x, p.y, EXIT.x, EXIT.y) < EXIT.radius;
}
