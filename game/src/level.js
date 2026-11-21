// level.js — the side-view museum/vault: platforms, vents, lamps, relics, exit.
// One wide hall, 1280 x 720. Ground floor plus two raised ledges, a crawl vent
// along the back wall, warm lamps, cold moon shafts and a glowing exit door.

export const LEVEL = {
  width: 1280,
  height: 720,
  groundY: 620,
  gravity: 0.55,
};

// Platforms the player and guards walk on: {x, y, w} — y is the top surface.
export const PLATFORMS = [
  { x: 0, y: 620, w: 1280, floor: true },          // ground floor
  { x: 90, y: 470, w: 300, floor: false },        // west mezzanine
  { x: 470, y: 430, w: 260, floor: false },       // central balcony
  { x: 830, y: 470, w: 300, floor: false },       // east mezzanine
  { x: 1080, y: 330, w: 160, floor: false },      // high perch by the exit
];

// Climbable pipes: {x, yTop, yBottom} — hold Up/W beside one to climb.
export const PIPES = [
  { x: 405, yTop: 470, yBottom: 620 },
  { x: 745, yTop: 430, yBottom: 620 },
  { x: 1100, yTop: 330, yBottom: 470 },
];

// Crawl vents: low dark tunnels behind crates. {x, y, w, h}
export const VENTS = [
  { x: 180, y: 566, w: 150, h: 54 },
  { x: 880, y: 566, w: 150, h: 54 },
];

// Crates and pillars that block sight and give cover: {x, y, w, h}
export const COVER = [
  { x: 150, y: 540, w: 70, h: 80, kind: 'crate' },
  { x: 560, y: 540, w: 90, h: 80, kind: 'crate' },
  { x: 960, y: 540, w: 70, h: 80, kind: 'crate' },
  { x: 440, y: 380, w: 46, h: 90, kind: 'pillar' },
  { x: 800, y: 380, w: 46, h: 90, kind: 'pillar' },
  { x: 250, y: 400, w: 60, h: 70, kind: 'crate' },
  { x: 900, y: 400, w: 60, h: 70, kind: 'crate' },
];

// Warm lamps hanging from the ceiling: {x, y, radius, flicker}
export const LAMPS = [
  { x: 220, y: 120, radius: 230, flicker: 0.10 },
  { x: 640, y: 100, radius: 270, flicker: 0.06 },
  { x: 1060, y: 120, radius: 230, flicker: 0.14 },
];

// Cold moonlight shafts from high windows: {x, topY, width, angle}
export const MOON_SHAFTS = [
  { x: 380, topY: 0, width: 90, angle: 0.22 },
  { x: 920, topY: 0, width: 70, angle: -0.18 },
];

// The three relics, glowing in the dark: {x, y, name, color}
export const RELICS = [
  { x: 250, y: 438, name: 'Jade Scarab', color: '#7fe0a8' },
  { x: 600, y: 398, name: 'Golden Idol', color: '#ffd76a' },
  { x: 1160, y: 298, name: 'Moon Pearl', color: '#bfe3ff' },
];

// The exit: a lit doorway at the far right of the ground floor.
export const EXIT = { x: 1200, y: 500, w: 64, h: 120 };

// Guard spawn posts: {x, platformY, minX, maxX, speed}
export const GUARD_POSTS = [
  { x: 420, platformY: 620, minX: 330, maxX: 560, speed: 0.7 },
  { x: 850, platformY: 620, minX: 700, maxX: 1040, speed: 0.9 },
  { x: 600, platformY: 430, minX: 480, maxX: 720, speed: 0.6 },
];

export const PLAYER_SPAWN = { x: 60, y: 620 };

// Find the platform top directly below a point (for landing / walking).
export function platformBelow(x, y) {
  let best = null;
  for (const p of PLATFORMS) {
    if (x >= p.x - 4 && x <= p.x + p.w + 4 && p.y >= y - 2) {
      if (!best || p.y < best.y) best = p;
    }
  }
  return best;
}

// Is a point inside a vent tunnel (crawl-only darkness)?
export function ventAt(x, y) {
  for (const v of VENTS) {
    if (x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h) return v;
  }
  return null;
}

// Is a point behind solid cover from a guard's eye? Simple 2D segment check
// against crate/pillar boxes: blocked if the segment crosses a box.
export function sightBlocked(ax, ay, bx, by) {
  for (const c of COVER) {
    if (segmentHitsBox(ax, ay, bx, by, c)) return true;
  }
  return false;
}

function segmentHitsBox(ax, ay, bx, by, b) {
  // Liang–Barsky clipping of the segment against the box.
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - b.x, b.x + b.w - ax, ay - b.y, b.y + b.h - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}
