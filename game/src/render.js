// render.js — canvas drawing: the bright atrium, bold shapes, big cones.
// One job: paint one frame. Palette rule from the design: everything is
// bright; the darkest thing on screen is a guard's navy uniform, so the
// guards, the amber cones and the green exit all read at thumbnail size.

import { TILE_W, TILE_H, GRID, tileToScreen, sortByDepth } from './iso.js';
import { COVER, COVER_KINDS, ARTIFACTS, EXIT, BALCONY, BALCONY_STEPS } from './level.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guard.js';

export const PALETTE = {
  floorA: '#f7ead0', // cream marble
  floorB: '#efdcb8',
  wall: '#c65d21', // terracotta walls
  wallTop: '#e07b39',
  sky: '#bfe3ff', // skylight blue
  floorEdge: '#d9b380',
  cone: 'rgba(255, 176, 32, 0.55)', // bold amber, the readable danger
  coneAlert: 'rgba(230, 57, 40, 0.6)',
  coneEdge: 'rgba(255, 140, 0, 0.9)',
  guardBody: '#1d2a4a', // dark navy — darkest thing on screen
  guardHat: '#f4f1e6',
  playerBody: '#0f766e', // teal thief
  playerHood: '#134e4a',
  exitGreen: '#22c55e',
  gold: '#ffb703',
};

// A diamond tile path at (x, y) tile coords, centred on its tile centre.
function diamondPath(ctx, x, y) {
  const c = tileToScreen(x + 0.5, y + 0.5);
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - TILE_H / 2);
  ctx.lineTo(c.x + TILE_W / 2, c.y);
  ctx.lineTo(c.x, c.y + TILE_H / 2);
  ctx.lineTo(c.x - TILE_W / 2, c.y);
  ctx.closePath();
}

function drawFloor(ctx, time) {
  // Sky glow behind the whole atrium, then the marble diamond floor.
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#cfeaff');
  sky.addColorStop(0.55, '#fdf6e3');
  sky.addColorStop(1, '#f7ead0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 720);

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      diamondPath(ctx, x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fill();
      ctx.strokeStyle = 'rgba(190, 150, 90, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // Terracotta wall rim around the floor: north and west edges read as
  // low walls, south and east as a bright baseboard.
  ctx.strokeStyle = PALETTE.wall;
  ctx.lineWidth = 10;
  ctx.beginPath();
  const nw = tileToScreen(0, 0);
  const ne = tileToScreen(GRID, 0);
  const se = tileToScreen(GRID, GRID);
  const sw = tileToScreen(0, GRID);
  ctx.moveTo(nw.x, nw.y - 6);
  ctx.lineTo(ne.x, ne.y - 6);
  ctx.lineTo(se.x, se.y - 6);
  ctx.lineTo(sw.x, sw.y - 6);
  ctx.closePath();
  ctx.stroke();
}

// A guard's vision cone: a wide amber wedge on the floor, red when alerted.
function drawCone(ctx, g) {
  const p = tileToScreen(g.x, g.y);
  const rangePx = CONE_RANGE * TILE_W * 0.53; // iso tiles read ~40 px per tile of reach
  const alert = g.state === 'chase';
  const base = alert ? PALETTE.coneAlert : PALETTE.cone;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, rangePx, g.facing - CONE_HALF_ANGLE, g.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = alert ? '#c1121f' : PALETTE.coneEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Hot core near the guard, brighter still.
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, rangePx * 0.45, g.facing - CONE_HALF_ANGLE, g.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = alert ? 'rgba(230, 57, 40, 0.35)' : 'rgba(255, 200, 60, 0.4)';
  ctx.fill();
}

// One extruded cover box: bright top face, darker side faces, bold outline.
function drawCover(ctx, c, time) {
  const kind = COVER_KINDS[c.kind];
  const p = tileToScreen(c.x + 0.5, c.y + 0.5);
  const h = kind.height;
  const w = 34;
  // Side faces (the box's height).
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.moveTo(p.x - w / 2, p.y - h + 8);
  ctx.lineTo(p.x - w / 2, p.y + 6);
  ctx.lineTo(p.x, p.y + 14);
  ctx.lineTo(p.x, p.y - h + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = kind.pot;
  ctx.beginPath();
  ctx.moveTo(p.x + w / 2, p.y - h + 8);
  ctx.lineTo(p.x + w / 2, p.y + 6);
  ctx.lineTo(p.x, p.y + 14);
  ctx.lineTo(p.x, p.y - h + 16);
  ctx.closePath();
  ctx.fill();
  // Top face: a bright diamond (or a leafy blob for planters).
  if (c.kind === 'planter') {
    ctx.fillStyle = kind.leaf;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - h, 30, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#37b24d';
    ctx.beginPath();
    ctx.ellipse(p.x - 8, p.y - h - 8, 16, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + 10, p.y - h - 6, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.kind === 'statue') {
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(p.x - 7, p.y - h, 14, h - 8);
    ctx.beginPath();
    ctx.arc(p.x, p.y - h - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind.pot;
    ctx.fillRect(p.x - 16, p.y - 10, 32, 10);
  } else {
    ctx.fillStyle = kind.leaf;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h - 6);
    ctx.lineTo(p.x + w / 2, p.y - h + 8);
    ctx.lineTo(p.x, p.y - h + 22);
    ctx.lineTo(p.x - w / 2, p.y - h + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 60, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(60, 30, 0, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x - w / 2, p.y - h + 8, w, h - 2);
}

// A pedestal with a glowing artifact (or an empty, dark pedestal).
function drawPedestal(ctx, a, taken, time) {
  const p = tileToScreen(a.x + 0.5, a.y + 0.5);
  const glow = 0.5 + 0.3 * Math.sin(time * 3 + a.x);
  if (!taken) {
    const g = ctx.createRadialGradient(p.x, p.y - 46, 4, p.x, p.y - 46, 44);
    g.addColorStop(0, a.color);
    g.addColorStop(1, 'rgba(255, 183, 3, 0)');
    ctx.globalAlpha = glow;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 46, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(p.x - 14, p.y - 26, 28, 26);
  ctx.fillStyle = '#a1887f';
  ctx.fillRect(p.x - 18, p.y - 30, 36, 8);
  if (!taken) {
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 44, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 47, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The exit: a big green glowing doorway on the south-east wall.
function drawExit(ctx, unlocked, time) {
  const p = tileToScreen(EXIT.x, EXIT.y);
  const pulse = 0.65 + 0.35 * Math.sin(time * 2.5);
  const g = ctx.createRadialGradient(p.x, p.y - 30, 6, p.x, p.y - 30, 90);
  g.addColorStop(0, unlocked ? `rgba(34, 197, 94, ${0.75 * pulse + 0.25})` : 'rgba(120, 130, 120, 0.35)');
  g.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 30, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = unlocked ? '#16a34a' : '#6b7280';
  ctx.beginPath();
  ctx.moveTo(p.x - 34, p.y + 4);
  ctx.lineTo(p.x - 34, p.y - 62);
  ctx.quadraticCurveTo(p.x, p.y - 92, p.x + 34, p.y - 62);
  ctx.lineTo(p.x + 34, p.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#dcfce7';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unlocked ? 'EXIT' : 'LOCKED', p.x, p.y - 34);
}

// A person: a bold round body, a head, a facing tick. Guards navy with a
// white cap; the thief teal with a dark hood. Big and simple on purpose.
function drawPerson(ctx, x, y, z, facing, opts) {
  const p = tileToScreen(x, y, z);
  const bob = opts.bob || 0;
  const bodyR = opts.big ? 19 : 15;
  // Shadow ellipse on the floor.
  ctx.fillStyle = 'rgba(60, 40, 10, 0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4, bodyR, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = opts.body;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 14 - bob, bodyR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Head.
  ctx.fillStyle = opts.head;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 30 - bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Facing tick — where this person is looking.
  ctx.strokeStyle = opts.tick || '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 30 - bob);
  ctx.lineTo(p.x + Math.cos(facing) * 16, p.y - 30 - bob + Math.sin(facing) * 16);
  ctx.stroke();
  return p;
}

// "?" or "!" bubble over a guard's head, sized to read at a glance.
function drawMark(ctx, g) {
  if (g.state !== 'suspicious' && g.state !== 'chase' && g.state !== 'search') return;
  const p = tileToScreen(g.x, g.y);
  const mark = g.state === 'chase' ? '!' : g.state === 'search' ? '?' : '?';
  const color = g.state === 'chase' ? '#dc2626' : '#d97706';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 58, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, p.x, p.y - 57);
  ctx.textBaseline = 'alphabetic';
}

// The balcony slab: a raised pale-marble platform on the north edge, with
// a teal front face and white step tiles climbing up to it.
function drawBalcony(ctx) {
  const a = tileToScreen(BALCONY.x0, BALCONY.y0);
  const b = tileToScreen(BALCONY.x1 + 1, BALCONY.y0);
  const c = tileToScreen(BALCONY.x1 + 1, BALCONY.y1 + 1);
  const d = tileToScreen(BALCONY.x0, BALCONY.y1 + 1);
  // Step tiles first (they sit on the floor, below the slab's top).
  for (const s of BALCONY_STEPS) {
    const p = tileToScreen(s.x + 0.5, s.y + 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 12);
    ctx.lineTo(p.x + 26, p.y);
    ctx.lineTo(p.x, p.y + 12);
    ctx.lineTo(p.x - 26, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = '#f2fbfa';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - BALCONY.height);
  ctx.lineTo(b.x, b.y - BALCONY.height);
  ctx.lineTo(c.x, c.y - BALCONY.height);
  ctx.lineTo(d.x, d.y - BALCONY.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a9d8f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#2a9d8f';
  ctx.beginPath();
  ctx.moveTo(d.x, d.y - BALCONY.height);
  ctx.lineTo(c.x, c.y - BALCONY.height);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  // Railing ticks along the balcony's back edge.
  ctx.strokeStyle = '#1f7a6e';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const rx = a.x + (b.x - a.x) * t;
    const ry = a.y + (b.y - a.y) * t;
    ctx.beginPath();
    ctx.moveTo(rx, ry - BALCONY.height);
    ctx.lineTo(rx, ry - BALCONY.height - 16);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - BALCONY.height - 16);
  ctx.lineTo(b.x, b.y - BALCONY.height - 16);
  ctx.stroke();
}

// One full frame. state: { player, guards, artifactsTaken:Set, time }.
export function render(ctx, state) {
  const { player, guards, time } = state;
  drawFloor(ctx, time);
  drawBalcony(ctx);
  // Cones first, on the floor, under everything that walks.
  for (const g of guards) drawCone(ctx, g);
  drawExit(ctx, state.artifactsTaken.size >= 3, time);
  // Depth-sorted drawables: cover, pedestals, guards, player.
  const items = [];
  for (const c of COVER) items.push({ kind: 'cover', x: c.x + 0.5, y: c.y + 0.5, c });
  for (const a of ARTIFACTS) items.push({ kind: 'pedestal', x: a.x + 0.5, y: a.y + 0.5, a });
  for (const g of guards) items.push({ kind: 'guard', x: g.x, y: g.y, g });
  items.push({ kind: 'player', x: player.x, y: player.y });
  for (const it of sortByDepth(items)) {
    if (it.kind === 'cover') drawCover(ctx, it.c, time);
    else if (it.kind === 'pedestal') drawPedestal(ctx, it.a, state.artifactsTaken.has(it.a.id), time);
    else if (it.kind === 'guard') {
      const bob = Math.sin(time * 6 + it.g.x) * 1.5;
      drawPerson(ctx, it.g.x, it.g.y, 0, it.g.facing, {
        body: PALETTE.guardBody, head: PALETTE.guardHat, big: true, bob,
      });
      drawMark(ctx, it.g);
    } else {
      const bob = player.moving ? Math.abs(Math.sin(player.stepPhase)) * 2 : 0;
      drawPerson(ctx, player.x, player.y, player.z, player.facing, {
        body: PALETTE.playerBody, head: PALETTE.playerHood, big: true, bob,
        tick: '#a7f3d0',
      });
    }
  }
}
