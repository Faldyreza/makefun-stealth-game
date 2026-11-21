// level.js — the museum floor for NIGHT SHIFT: THE VAULT HEIST.
// One fixed 1280x720 room split into three named zones (Archive / Vault /
// Gallery) joined by doorways. Walls and tall shelves block sight; crates
// block movement only; shadow patches slow detection, lamp pools speed it.
// Everything here is plain data plus the geometry helpers the rest of the
// game uses (circle collision, line-of-sight, ray casting).

export const WORLD_W = 1280;
export const WORLD_H = 720;

// A rectangle: { x, y, w, h }. All coordinates are in world pixels.
function rect(x, y, w, h) {
  return { x, y, w, h };
}

// Turn a rectangle into its four edge segments, for ray casting.
function rectEdges(r) {
  return [
    { ax: r.x, ay: r.y, bx: r.x + r.w, by: r.y },
    { ax: r.x + r.w, ay: r.y, bx: r.x + r.w, by: r.y + r.h },
    { ax: r.x + r.w, ay: r.y + r.h, bx: r.x, by: r.y + r.h },
    { ax: r.x, ay: r.y + r.h, bx: r.x, by: r.y },
  ];
}

// Do two line segments cross? Returns the hit point or null.
export function segmentsCross(a, b, c, d) {
  const rX = b.x - a.x;
  const rY = b.y - a.y;
  const sX = d.x - c.x;
  const sY = d.y - c.y;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c.x - a.x) * sY - (c.y - a.y) * sX) / denom;
  const u = ((c.x - a.x) * rY - (c.y - a.y) * rX) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * rX, y: a.y + t * rY, t };
}

export function buildLevel() {
  // ---- solid walls -------------------------------------------------------
  const walls = [
    rect(0, 0, 1280, 20), // top
    rect(0, 700, 1280, 20), // bottom
    rect(0, 0, 20, 720), // left
    rect(1260, 0, 20, 720), // right
    // Divider Archive | Vault, doorway y 270..400
    rect(440, 20, 16, 250),
    rect(440, 400, 16, 300),
    // Divider Vault | Gallery, doorway y 400..520
    rect(824, 20, 16, 380),
    rect(824, 520, 16, 180),
    // Half wall inside the Archive, gap on its right end
    rect(20, 480, 220, 16),
    // Half wall inside the Gallery, gap on its left end
    rect(1040, 430, 220, 16),
  ];

  // ---- tall cover: blocks movement AND sight ----------------------------
  const shelves = [
    rect(80, 120, 120, 36), // Archive shelf row 1
    rect(260, 120, 120, 36),
    rect(80, 300, 120, 36), // Archive shelf row 2
    rect(260, 300, 120, 36),
    rect(560, 180, 130, 36), // Vault shelf, upper
    rect(560, 520, 130, 36), // Vault shelf, lower
    rect(920, 120, 120, 36), // Gallery shelf, upper
    rect(1080, 300, 110, 36), // Gallery shelf, middle
  ];

  // Stone pillars: small square blockers that also stop sight.
  const pillars = [
    rect(620, 330, 28, 28),
    rect(700, 420, 28, 28),
    rect(1000, 560, 28, 28),
  ];

  // ---- low cover: blocks movement, but a guard can see over it ----------
  const crates = [
    rect(120, 560, 40, 40),
    rect(170, 560, 40, 40),
    rect(330, 590, 40, 40),
    rect(520, 250, 40, 40),
    rect(700, 250, 40, 40),
    rect(980, 560, 40, 40),
  ];

  // ---- decoration only: no collision, no sight block --------------------
  const plants = [
    { x: 60, y: 60, r: 16 },
    { x: 410, y: 660, r: 15 },
    { x: 1010, y: 60, r: 16 },
    { x: 1230, y: 660, r: 15 },
    { x: 640, y: 60, r: 14 },
    { x: 60, y: 440, r: 14 },
  ];

  // ---- light and dark ----------------------------------------------------
  // Shadow patches: detection runs at less than half speed inside them.
  const shadows = [
    rect(20, 560, 190, 140),
    rect(660, 560, 160, 140),
    rect(1040, 20, 216, 110),
  ];
  // Warm lamp pools: detection runs faster inside them.
  const lights = [
    { x: 300, y: 200, r: 78 },
    { x: 640, y: 360, r: 78 },
    { x: 1050, y: 350, r: 78 },
    { x: 480, y: 640, r: 62 },
  ];

  // ---- zones, relics, exit, spawn ---------------------------------------
  const zones = [
    { name: 'ARCHIVE', x: 20, y: 20, w: 420, h: 680, labelX: 230, labelY: 108 },
    { name: 'VAULT', x: 456, y: 20, w: 368, h: 680, labelX: 640, labelY: 108 },
    { name: 'GALLERY', x: 840, y: 20, w: 420, h: 680, labelX: 960, labelY: 108 },
  ];

  const relics = [
    { x: 110, y: 100, taken: false, name: 'Jade Idol' },
    { x: 380, y: 620, taken: false, name: 'Gold Mask' },
    { x: 640, y: 300, taken: false, name: 'Ruby Crown' },
    { x: 790, y: 640, taken: false, name: 'Pearl Chalice' },
    { x: 1180, y: 620, taken: false, name: 'Sapphire Eye' },
  ];

  // The exit door sits in the top wall of the Gallery, clear of the
  // minimap, and glows green once all five relics are pocketed.
  const exit = { x: 870, y: 20, w: 60, h: 34, locked: true };
  const spawn = { x: 70, y: 650 };

  // ---- guards: type, home, route ----------------------------------------
  // Routes were hand-checked to run down open lanes only, never through a
  // wall, shelf, pillar or crate.
  const guardDefs = [
    {
      kind: 'patroller', name: 'Patroller Ada',
      x: 230, y: 220, angle: 0,
      waypoints: [
        { x: 230, y: 220 }, { x: 380, y: 220 },
        { x: 380, y: 420 }, { x: 230, y: 420 },
      ],
    },
    {
      kind: 'patroller', name: 'Patroller Bram',
      x: 500, y: 120, angle: Math.PI / 2,
      waypoints: [
        { x: 500, y: 120 }, { x: 780, y: 120 },
        { x: 780, y: 600 }, { x: 500, y: 600 },
      ],
    },
    {
      kind: 'patroller', name: 'Patroller Cleo',
      x: 900, y: 180, angle: 0,
      waypoints: [
        { x: 900, y: 180 }, { x: 1200, y: 180 },
        { x: 1200, y: 380 }, { x: 900, y: 380 },
      ],
    },
    {
      kind: 'sentry', name: 'Sentry Dara',
      x: 480, y: 335, angle: 0,
      waypoints: [{ x: 480, y: 335 }],
    },
    {
      kind: 'sentry', name: 'Sentry Emil',
      x: 880, y: 460, angle: Math.PI,
      waypoints: [{ x: 880, y: 460 }],
    },
    {
      kind: 'roamer', name: 'Roamer Finn',
      x: 200, y: 650, angle: -Math.PI / 2,
      waypoints: [
        { x: 200, y: 650 }, { x: 480, y: 640 }, { x: 480, y: 460 },
        { x: 640, y: 460 }, { x: 900, y: 460 }, { x: 1150, y: 460 },
        { x: 1150, y: 600 }, { x: 900, y: 650 }, { x: 640, y: 650 },
        { x: 480, y: 650 }, { x: 480, y: 360 }, { x: 420, y: 360 },
        { x: 420, y: 200 }, { x: 420, y: 560 }, { x: 300, y: 560 },
      ],
    },
  ];

  // ---- geometry derived from the layout ---------------------------------
  const solids = [...walls, ...shelves, ...pillars, ...crates];
  const sightBlockers = [...walls, ...shelves, ...pillars];
  const sightSegments = [];
  for (const r of sightBlockers) sightSegments.push(...rectEdges(r));

  const level = {
    walls, shelves, pillars, crates, plants, shadows, lights,
    zones, relics, exit, spawn, guardDefs, solids, sightSegments,
  };

  // Push a circle (px, py, radius) out of every solid rectangle.
  level.resolveCircle = function (pos, radius) {
    for (let pass = 0; pass < 2; pass++) {
      for (const r of solids) {
        const cx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
        const cy = Math.max(r.y, Math.min(pos.y, r.y + r.h));
        let dx = pos.x - cx;
        let dy = pos.y - cy;
        let d2 = dx * dx + dy * dy;
        if (d2 >= radius * radius) continue;
        if (d2 < 1e-6) {
          // Centre inside the rectangle: shove out along the smallest side.
          const left = pos.x - r.x;
          const right = r.x + r.w - pos.x;
          const top = pos.y - r.y;
          const bottom = r.y + r.h - pos.y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) pos.x = r.x - radius;
          else if (m === right) pos.x = r.x + r.w + radius;
          else if (m === top) pos.y = r.y - radius;
          else pos.y = r.y + r.h + radius;
          continue;
        }
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        pos.x = cx + dx * radius;
        pos.y = cy + dy * radius;
      }
    }
    return pos;
  };

  // True when nothing tall stands between two points.
  level.hasLineOfSight = function (ax, ay, bx, by) {
    const a = { x: ax, y: ay };
    const b = { x: bx, y: by };
    for (const s of sightSegments) {
      if (segmentsCross(a, b, { x: s.ax, y: s.ay }, { x: s.bx, y: s.by })) {
        return false;
      }
    }
    return true;
  };

  // Cast one ray from (ox, oy) along an angle; stop at the first tall
  // blocker or at maxDist. Returns the end point of the ray.
  level.castRay = function (ox, oy, angle, maxDist) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const end = { x: ox + dx * maxDist, y: oy + dy * maxDist };
    let best = maxDist;
    let hit = end;
    const a = { x: ox, y: oy };
    for (const s of sightSegments) {
      const p = segmentsCross(a, end, { x: s.ax, y: s.ay }, { x: s.bx, y: s.by });
      if (p && p.t < best) {
        best = p.t;
        hit = { x: p.x, y: p.y };
      }
    }
    return hit;
  };

  // Detection multiplier for a point: shadow slows it, lamplight speeds it.
  level.lightFactorAt = function (x, y) {
    for (const s of shadows) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return 0.45;
    }
    for (const l of lights) {
      const dx = x - l.x;
      const dy = y - l.y;
      if (dx * dx + dy * dy <= l.r * l.r) return 1.6;
    }
    return 1.0;
  };

  level.inShadow = function (x, y) {
    for (const s of shadows) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    }
    return false;
  };

  return level;
}
