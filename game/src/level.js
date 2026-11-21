// level.js — the archive floor: walls, cover, shadows, keys, exit, patrol routes.
// Everything the stealth systems need to ask about the map lives here: what blocks
// movement, what blocks a guard's line of sight, where it is dark, where it is lit.

export const LEVEL_WIDTH = 1280;
export const LEVEL_HEIGHT = 720;
export const WALL = 16;

// Every solid object on the floor. kind drives how render.js draws it.
export const SOLIDS = [
  // Outer walls (the room shell).
  { x: 0, y: 0, w: LEVEL_WIDTH, h: WALL, kind: 'wall' },
  { x: 0, y: LEVEL_HEIGHT - WALL, w: LEVEL_WIDTH, h: WALL, kind: 'wall' },
  { x: 0, y: 0, w: WALL, h: LEVEL_HEIGHT, kind: 'wall' },
  { x: LEVEL_WIDTH - WALL, y: 0, w: WALL, h: LEVEL_HEIGHT, kind: 'wall' },

  // Archive shelving — tall stacks that block sight completely.
  { x: 300, y: 120, w: 220, h: 42, kind: 'shelf' },
  { x: 700, y: 120, w: 220, h: 42, kind: 'shelf' },
  { x: 420, y: 480, w: 260, h: 42, kind: 'shelf' },
  { x: 180, y: 300, w: 44, h: 200, kind: 'shelf' },
  { x: 980, y: 300, w: 120, h: 180, kind: 'stack' },

  // Crates — low cover you can duck behind.
  { x: 560, y: 300, w: 96, h: 96, kind: 'crate' },
  { x: 760, y: 420, w: 96, h: 96, kind: 'crate' },
  { x: 1000, y: 540, w: 120, h: 72, kind: 'crate' },
  { x: 240, y: 560, w: 110, h: 64, kind: 'crate' },

  // Pillars — round-ish cover in the open floor.
  { x: 636, y: 330, w: 40, h: 40, kind: 'pillar' },
  { x: 880, y: 220, w: 40, h: 40, kind: 'pillar' },
  { x: 330, y: 420, w: 40, h: 40, kind: 'pillar' },
];

// Dark patches where the lamps don't reach — detection fills much slower here.
export const SHADOWS = [
  { x: 150, y: 150, w: 260, h: 140 },
  { x: 850, y: 450, w: 300, h: 170 },
  { x: 450, y: 180, w: 180, h: 120 },
  { x: 40, y: 560, w: 220, h: 120 },
];

// Warm pools of lamplight — being spotted here fills the meter faster.
export const LIGHTS = [
  { x: 640, y: 360, r: 170 },
  { x: 1120, y: 120, r: 130 },
  { x: 200, y: 620, r: 120 },
  { x: 950, y: 560, r: 110 },
];

// The three archive documents to steal.
export const KEY_SPOTS = [
  { x: 380, y: 220, label: 'Ledger A' },
  { x: 900, y: 220, label: 'Ledger B' },
  { x: 640, y: 620, label: 'Ledger C' },
];

// The glowing green exit door, on the right-hand wall — clear of the HUD bar.
export const EXIT = { x: LEVEL_WIDTH - WALL, y: 300, w: WALL, h: 110 };

export const PLAYER_START = { x: 96, y: 640 };

// Fixed patrol routes: lists of waypoints each guard walks in order, looping.
export const PATROLS = [
  // Central guard — sweeps the middle of the floor, around the crate block.
  [{ x: 350, y: 350 }, { x: 520, y: 260 }, { x: 700, y: 260 }, { x: 700, y: 430 }, { x: 520, y: 430 }],
  // East guard — guards the exit corridor and the tall stacks.
  [{ x: 960, y: 150 }, { x: 960, y: 260 }, { x: 1150, y: 260 }, { x: 1150, y: 520 }, { x: 960, y: 520 }],
  // West guard — walks the left aisle past the shelves.
  [{ x: 260, y: 180 }, { x: 260, y: 540 }],
  // South guard — slow beat along the bottom, near the entrance.
  [{ x: 560, y: 640 }, { x: 1020, y: 640 }],
];

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Does a circle of radius r at (x, y) overlap any solid? Used for movement.
export function circleHitsSolid(x, y, r) {
  for (const s of SOLIDS) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return s;
  }
  return null;
}

// Slab test: does segment (x1,y1)-(x2,y2) cross rectangle r?
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Does any solid block the line of sight between two points?
export function sightBlocked(x1, y1, x2, y2) {
  for (const s of SOLIDS) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return true;
  }
  return false;
}

export function inShadow(x, y) {
  return SHADOWS.some((s) => pointInRect(x, y, s));
}

export function inLight(x, y) {
  return LIGHTS.some((l) => {
    const dx = x - l.x;
    const dy = y - l.y;
    return dx * dx + dy * dy < l.r * l.r;
  });
}
