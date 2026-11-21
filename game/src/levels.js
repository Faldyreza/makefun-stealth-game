// levels.js — the three floors of the museum heist.
// Each level is a fresh object: walls and tall cover block sight AND movement,
// low cover blocks movement only, shadows slow detection, lamps speed it up.
// Patrol routes were drawn to run in open corridors only, never through cover.

export const LEVEL_COUNT = 3;
export const WORLD = { x: 16, y: 68, w: 1248, h: 636 }; // inside the outer walls

function outerWalls() {
  return [
    { x: 0, y: 52, w: 1280, h: 16 },    // top (below the HUD bar)
    { x: 0, y: 704, w: 1280, h: 16 },   // bottom
    { x: 0, y: 52, w: 16, h: 668 },     // left
    { x: 1264, y: 52, w: 16, h: 668 },  // right
  ];
}

function shadow(x, y, w, h) { return { x, y, w, h }; }
function lamp(x, y, r) { return { x, y, r }; }
function relic(x, y, name) { return { x, y, name, taken: false }; }
function prop(kind, x, y, w, h) { return { kind, x, y, w, h }; }

// --- LEVEL 1 · THE ARCHIVE — warm wood and paper, 3 patrollers -------------
function archiveLevel() {
  return {
    index: 0,
    name: 'LEVEL 1 — THE ARCHIVE',
    objective: 'Steal 2 relics, then slip out the top door',
    theme: {
      floor: '#2b2015', floorAlt: '#251b11', wall: '#4a3423', trim: '#b08d4f',
      lamp: '#ffb347', carpet: null, accent: '#e8b64c',
    },
    walls: [
      ...outerWalls(),
    ],
    // Tall shelves and pillars: block sight and movement.
    tall: [
      { x: 200, y: 180, w: 360, h: 40 },
      { x: 720, y: 180, w: 360, h: 40 },
      { x: 200, y: 420, w: 360, h: 40 },
      { x: 720, y: 420, w: 360, h: 40 },
      { x: 170, y: 300, w: 36, h: 36 },
      { x: 1074, y: 300, w: 36, h: 36 },
    ],
    // Low cover: desks, crates, plants — hide behind nothing, but block the way.
    low: [
      { x: 300, y: 300, w: 120, h: 56 },
      { x: 860, y: 300, w: 120, h: 56 },
      { x: 300, y: 540, w: 120, h: 56 },
      { x: 860, y: 540, w: 120, h: 56 },
      { x: 100, y: 380, w: 44, h: 44 },
      { x: 1136, y: 380, w: 44, h: 44 },
      { x: 60, y: 120, w: 28, h: 28 },
      { x: 1192, y: 120, w: 28, h: 28 },
      { x: 60, y: 660, w: 28, h: 28 },
      { x: 1192, y: 660, w: 28, h: 28 },
    ],
    shadows: [
      shadow(200, 220, 360, 26), shadow(720, 220, 360, 26),
      shadow(200, 460, 360, 26), shadow(720, 460, 360, 26),
      shadow(16, 68, 120, 90), shadow(1144, 614, 120, 90),
      shadow(16, 614, 120, 90),
    ],
    lamps: [lamp(320, 130, 140), lamp(960, 130, 140), lamp(320, 630, 140), lamp(960, 630, 140)],
    props: [
      prop('scroll', 220, 186, 60, 28), prop('scroll', 740, 186, 60, 28),
      prop('scroll', 220, 426, 60, 28), prop('scroll', 740, 426, 60, 28),
      prop('desk', 300, 300, 120, 56), prop('desk', 860, 300, 120, 56),
      prop('desk', 300, 540, 120, 56), prop('desk', 860, 540, 120, 56),
      prop('crate', 100, 380, 44, 44), prop('crate', 1136, 380, 44, 44),
      prop('plant', 60, 120, 28, 28), prop('plant', 1192, 120, 28, 28),
      prop('plant', 60, 660, 28, 28), prop('plant', 1192, 660, 28, 28),
      prop('painting', 640, 60, 90, 10), prop('painting', 90, 360, 10, 70),
    ],
    relics: [
      relic(120, 360, 'Brass Astrolabe'),
      relic(1160, 648, 'Illuminated Manuscript'),
    ],
    exit: { x: 600, y: 52, w: 80, h: 30 },
    fuse: null,
    cameras: [],
    playerSpawn: { x: 640, y: 660 },
    guards: [
      { kind: 'patroller', x: 100, y: 120, waypoints: [[100, 120], [1180, 120], [1180, 270], [100, 270]] },
      { kind: 'patroller', x: 100, y: 490, waypoints: [[100, 490], [1180, 490], [1180, 660], [100, 660]] },
      { kind: 'patroller', x: 640, y: 110, waypoints: [[640, 110], [640, 660]] },
    ],
  };
}

// --- LEVEL 2 · THE VAULT — cold steel, cameras, 4 guards -------------------
function vaultLevel() {
  return {
    index: 1,
    name: 'LEVEL 2 — THE VAULT',
    objective: 'Cut the fuse box, steal 2 relics, reach the top-left door',
    theme: {
      floor: '#1c2733', floorAlt: '#18222d', wall: '#3a4a5c', trim: '#7fb2d9',
      lamp: '#9fd8ff', carpet: null, accent: '#6fc3ff',
    },
    walls: [
      ...outerWalls(),
      { x: 16, y: 300, w: 544, h: 20 },   // hall divider, gap x 560..640
      { x: 640, y: 300, w: 256, h: 20 },
      { x: 896, y: 300, w: 20, h: 180 },  // vault divider, gap y 480..560
      { x: 896, y: 560, w: 20, h: 144 },
    ],
    tall: [
      { x: 200, y: 140, w: 220, h: 36 },
      { x: 200, y: 520, w: 220, h: 36 },
      { x: 1000, y: 420, w: 180, h: 36 },
      { x: 1000, y: 560, w: 180, h: 36 },
      { x: 480, y: 120, w: 36, h: 36 },
    ],
    low: [
      { x: 300, y: 120, w: 140, h: 60 },
      { x: 1050, y: 120, w: 140, h: 60 },
      { x: 60, y: 380, w: 44, h: 44 },
      { x: 760, y: 620, w: 44, h: 44 },
      { x: 60, y: 120, w: 28, h: 28 },
    ],
    shadows: [
      shadow(16, 614, 180, 90), shadow(950, 68, 314, 60),
      shadow(200, 176, 220, 24), shadow(200, 556, 220, 24),
      shadow(1000, 456, 180, 24), shadow(16, 320, 120, 90),
    ],
    lamps: [lamp(320, 120, 130), lamp(960, 660, 130), lamp(640, 420, 150)],
    props: [
      prop('safe', 200, 140, 220, 36), prop('safe', 200, 520, 220, 36),
      prop('safe', 1000, 420, 180, 36), prop('safe', 1000, 560, 180, 36),
      prop('desk', 300, 120, 140, 60), prop('desk', 1050, 120, 140, 60),
      prop('crate', 60, 380, 44, 44), prop('crate', 760, 620, 44, 44),
      prop('plant', 60, 120, 28, 28),
      prop('painting', 1050, 60, 120, 10),
    ],
    relics: [
      relic(1150, 200, 'Sapphire Tiara'),
      relic(960, 140, 'Gold Bullion'),
    ],
    exit: { x: 120, y: 52, w: 80, h: 30 },
    fuse: { x: 1220, y: 660, used: false },
    cameras: [
      { x: 900, y: 70, baseAngle: Math.PI / 2, sweep: 0.9, range: 280, speed: 0.55 },
      { x: 700, y: 322, baseAngle: Math.PI / 2, sweep: 0.8, range: 260, speed: 0.7 },
    ],
    playerSpawn: { x: 640, y: 660 },
    guards: [
      { kind: 'patroller', x: 100, y: 120, waypoints: [[100, 120], [500, 120], [500, 250], [100, 250]] },
      { kind: 'patroller', x: 100, y: 420, waypoints: [[100, 420], [820, 420], [820, 660], [100, 660]] },
      { kind: 'sentry', x: 1000, y: 280, waypoints: [[1000, 280]] },
      { kind: 'roamer', x: 150, y: 380, waypoints: [[150, 380], [450, 380], [450, 600], [150, 600]] },
    ],
  };
}

// --- LEVEL 3 · THE GALLERY — red carpet, gold frames, 5 guards, 1 Elite ----
function galleryLevel() {
  return {
    index: 2,
    name: 'LEVEL 3 — THE GALLERY',
    objective: 'Take the Crimson Vermeer, then escape out the bottom door',
    theme: {
      floor: '#33161c', floorAlt: '#2b1218', wall: '#5c2a2a', trim: '#d4af37',
      lamp: '#ffd98a', carpet: '#6e1423', accent: '#ffd24d',
    },
    walls: [
      ...outerWalls(),
    ],
    tall: [
      { x: 320, y: 200, w: 44, h: 44 },
      { x: 960, y: 200, w: 44, h: 44 },
      { x: 320, y: 500, w: 44, h: 44 },
      { x: 960, y: 500, w: 44, h: 44 },
      { x: 608, y: 320, w: 64, h: 64 },
    ],
    low: [
      { x: 240, y: 300, w: 180, h: 54 },
      { x: 860, y: 300, w: 180, h: 54 },
      { x: 240, y: 440, w: 180, h: 54 },
      { x: 860, y: 440, w: 180, h: 54 },
      { x: 300, y: 180, w: 160, h: 30 },
      { x: 820, y: 540, w: 160, h: 30 },
    ],
    shadows: [
      shadow(16, 68, 110, 90), shadow(1154, 68, 110, 90),
      shadow(16, 614, 110, 90), shadow(1154, 614, 110, 90),
      shadow(364, 200, 60, 44), shadow(1004, 200, 60, 44),
      shadow(560, 384, 160, 60),
    ],
    lamps: [lamp(320, 120, 140), lamp(960, 120, 140), lamp(320, 640, 140), lamp(960, 640, 140)],
    props: [
      prop('statue', 320, 200, 44, 44), prop('statue', 960, 200, 44, 44),
      prop('statue', 320, 500, 44, 44), prop('statue', 960, 500, 44, 44),
      prop('statue', 608, 320, 64, 64),
      prop('case', 240, 300, 180, 54), prop('case', 860, 300, 180, 54),
      prop('case', 240, 440, 180, 54), prop('case', 860, 440, 180, 54),
      prop('bench', 300, 180, 160, 30), prop('bench', 820, 540, 160, 30),
      prop('painting', 200, 60, 110, 12), prop('painting', 480, 60, 110, 12),
      prop('painting', 760, 60, 110, 12), prop('painting', 1040, 60, 110, 12),
      prop('painting', 60, 360, 12, 90), prop('painting', 1208, 360, 12, 90),
    ],
    relics: [
      relic(640, 130, 'The Crimson Vermeer'),
    ],
    exit: { x: 600, y: 688, w: 80, h: 32 },
    fuse: { x: 1230, y: 110, used: false },
    cameras: [
      { x: 400, y: 70, baseAngle: Math.PI / 2, sweep: 0.9, range: 280, speed: 0.6 },
      { x: 1262, y: 360, baseAngle: Math.PI, sweep: 0.85, range: 280, speed: 0.65 },
    ],
    playerSpawn: { x: 120, y: 120 },
    guards: [
      { kind: 'patroller', x: 400, y: 120, waypoints: [[400, 120], [1160, 120], [1160, 260], [120, 260]] },
      { kind: 'patroller', x: 120, y: 600, waypoints: [[120, 600], [1160, 600], [1160, 660], [120, 660]] },
      { kind: 'patroller', x: 120, y: 360, waypoints: [[120, 360], [1160, 360], [1160, 420], [120, 420]] },
      { kind: 'sentry', x: 640, y: 260, waypoints: [[640, 260]] },
      { kind: 'elite', x: 560, y: 140, waypoints: [[560, 140], [720, 140], [720, 640], [560, 640]] },
    ],
  };
}

/** Build a fresh, mutable level object for the given index (0-based). */
export function buildLevel(index) {
  if (index === 0) return archiveLevel();
  if (index === 1) return vaultLevel();
  return galleryLevel();
}

/** Every solid rectangle that blocks movement: walls + tall cover + low cover. */
export function solidRects(level) {
  return [...level.walls, ...level.tall, ...level.low];
}

/** Every rectangle that blocks sight: walls + tall cover only. */
export function sightBlockers(level) {
  return [...level.walls, ...level.tall];
}

/** Total relics across the whole run (2 + 2 + 1 = 5). */
export function totalRelics() {
  return 5;
}
