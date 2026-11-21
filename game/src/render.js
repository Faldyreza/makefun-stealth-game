// render.js — everything drawn on the canvas: the floor, the three zones,
// cover, lamps and shadows, relics and the glowing exit, the guards with
// their raycast vision cones (clipped by walls and tall shelves, never
// drawn through them), and the player. No images anywhere: all art is
// drawn in code.

import { WORLD_W, WORLD_H } from './level.js';
import { guardStage } from './guard.js';

const CONE_RAYS = 30;

// Build the guard's vision cone as a polygon: cast a fan of rays and stop
// each one at the first wall or tall shelf it hits, so the cone is visibly
// blocked by cover instead of painted over it.
export function conePolygon(level, guard) {
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = guard.angle - guard.halfAngle + (2 * guard.halfAngle * i) / CONE_RAYS;
    pts.push(level.castRay(guard.x, guard.y, a, guard.coneLen));
  }
  return pts;
}

function drawPolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawFloor(ctx, level, now) {
  // Dark floorboards with a faint checker so movement reads at a glance.
  ctx.fillStyle = '#171a24';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#1b1f2b';
  const tile = 40;
  for (let y = 20; y < 700; y += tile) {
    for (let x = 20; x < 1260; x += tile) {
      if (((x / tile) | 0) % 2 === ((y / tile) | 0) % 2) {
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
  // Zone tints: a different cool wash per zone, plus a big floor label.
  const tints = ['rgba(64, 110, 180, 0.06)', 'rgba(180, 150, 60, 0.05)', 'rgba(120, 70, 170, 0.06)'];
  level.zones.forEach((z, i) => {
    ctx.fillStyle = tints[i];
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = 'rgba(220, 225, 240, 0.13)';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.name, z.labelX, z.labelY);
  });
  // Shadow patches: deep dark, the safe places.
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(2, 4, 10, 0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(120, 150, 220, 0.18)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
  // Warm lamp pools.
  for (const l of level.lights) {
    const g = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(255, 196, 110, 0.20)');
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Doorway markers: thin amber dashes across each gap so the routes read.
  ctx.fillStyle = 'rgba(255, 200, 90, 0.35)';
  ctx.fillRect(440, 270, 16, 130);
  ctx.fillRect(824, 400, 16, 120);
}

function drawCover(ctx, level) {
  // Walls: dark slate with a lit top edge.
  for (const w of level.walls) {
    ctx.fillStyle = '#2c3145';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#454e6b';
    if (w.h <= 20) ctx.fillRect(w.x, w.y, w.w, 3);
    else ctx.fillRect(w.x, w.y, 3, w.h);
  }
  // Tall shelves: brown stacks with slats — these block sight.
  for (const s of level.shelves) {
    ctx.fillStyle = '#4a3421';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, 5);
    ctx.fillRect(s.x + 3, s.y + s.h - 8, s.w - 6, 5);
    ctx.fillStyle = '#2e2013';
    for (let x = s.x + 14; x < s.x + s.w - 8; x += 18) {
      ctx.fillRect(x, s.y + 9, 3, s.h - 18);
    }
  }
  // Pillars: stone circles with a highlight.
  for (const p of level.pillars) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.fillStyle = '#3a4157';
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#59617e';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crates: low wooden boxes (a guard can see over these).
  for (const c of level.crates) {
    ctx.fillStyle = '#7a5a2e';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#4e3a1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y);
    ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
  }
  // Plants: soft green blobs.
  for (const p of level.plants) {
    ctx.fillStyle = '#1e4d2a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7a3e';
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - 4, p.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRelicsAndExit(ctx, level, now) {
  const pulse = 0.65 + 0.35 * Math.sin(now * 3);
  for (const r of level.relics) {
    if (r.taken) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, `rgba(255, 214, 90, ${0.5 * pulse})`);
    g.addColorStop(1, 'rgba(255, 214, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd65a';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  // The exit: a glowing green door in the top wall of the Gallery.
  const e = level.exit;
  const open = !e.locked;
  const glow = ctx.createRadialGradient(e.x + e.w / 2, e.y + e.h, 4, e.x + e.w / 2, e.y + e.h, 90);
  glow.addColorStop(0, open ? `rgba(80, 255, 140, ${0.55 * pulse})` : 'rgba(255, 90, 90, 0.25)');
  glow.addColorStop(1, 'rgba(80, 255, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(e.x - 50, e.y, e.w + 100, 110);
  ctx.fillStyle = open ? '#2fae5f' : '#5a2f35';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#7dffab' : '#c05a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.fillStyle = open ? '#d8ffe4' : '#e8b0b0';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h + 16);
  if (!e.locked) {
    ctx.fillStyle = '#7dffab';
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y + e.h + 22);
    ctx.lineTo(e.x + e.w / 2 - 6, e.y + e.h + 32);
    ctx.lineTo(e.x + e.w / 2 + 6, e.y + e.h + 32);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGuard(ctx, level, guard, now) {
  const stage = guardStage(guard);
  const poly = conePolygon(level, guard);
  // Cone colour follows suspicion: pale yellow -> amber -> red.
  const s = guard.suspicion;
  const r = Math.round(255 - 40 * s);
  const g = Math.round(214 - 150 * s);
  const b = Math.round(80 - 40 * s);
  const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, guard.coneLen);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.34 + 0.25 * s})`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);
  ctx.fillStyle = grad;
  drawPolygon(ctx, poly);
  ctx.fill();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Body: navy uniform with a cap, facing tick, and a coloured ring that
  // shows the kind (sentry = long cone, roamer = quick).
  ctx.fillStyle = '#1d2f57';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = guard.kind === 'sentry' ? '#8fd0ff' : guard.kind === 'roamer' ? '#d0a0ff' : '#7fa8e0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#dfe8ff';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Suspicion arc overhead + the "?" / "!" marker.
  if (guard.suspicion > 0.03) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = stage === 'alert' ? '#ff4d4d' : '#ffd23e';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
    ctx.stroke();
  }
  if (stage !== 'unaware') {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = stage === 'alert' ? '#ff4d4d' : '#ffd23e';
    ctx.fillText(stage === 'alert' ? '!' : '?', guard.x, guard.y - 24);
  }
}

function drawPlayer(ctx, player, level, now) {
  // A small hooded figure: dark cloak, pale face, a facing tick.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x + 2, player.y + 4, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.sneaking ? '#3d2f5e' : '#232a3d';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8fa3d9';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 5, player.y + Math.sin(player.facing) * 5, 5, 0, Math.PI * 2);
  ctx.fill();
  if (level.inShadow(player.x, player.y)) {
    ctx.strokeStyle = 'rgba(140, 170, 255, 0.8)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Click-to-move marker.
  if (player.clickTarget) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.clickTarget.x, player.clickTarget.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.clickTarget.x - 10, player.clickTarget.y);
    ctx.lineTo(player.clickTarget.x + 10, player.clickTarget.y);
    ctx.moveTo(player.clickTarget.x, player.clickTarget.y - 10);
    ctx.lineTo(player.clickTarget.x, player.clickTarget.y + 10);
    ctx.stroke();
  }
}

export function renderGame(ctx, level, player, guards, now) {
  drawFloor(ctx, level, now);
  drawRelicsAndExit(ctx, level, now);
  for (const guard of guards) drawGuard(ctx, level, guard, now);
  drawCover(ctx, level);
  drawPlayer(ctx, player, level, now);
}
