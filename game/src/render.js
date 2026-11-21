// render.js — draws the whole night: floor patterns and props per theme,
// lamp pools and shadow patches, raycast vision cones, animated guard and
// thief sprites, big "?" / "!" indicators with suspicion arcs, the glowing
// exit, and the red screen-edge pulse when the alarm is up.

import { castCone } from './lighting.js';

const TILE = 64;

function drawFloor(ctx, level) {
  const t = level.theme;
  ctx.fillStyle = t.floor;
  ctx.fillRect(0, 52, 1280, 668);
  // Checkerboard tiles, subtly different per theme.
  for (let y = 52; y < 720; y += TILE) {
    for (let x = 0; x < 1280; x += TILE) {
      if (((x / TILE) + ((y - 52) / TILE)) % 2 === 0) {
        ctx.fillStyle = t.floorAlt;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // Gallery red carpet down the middle.
  if (t.carpet) {
    ctx.fillStyle = t.carpet;
    ctx.fillRect(560, 68, 160, 636);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.fillRect(560, 68, 4, 636);
    ctx.fillRect(716, 68, 4, 636);
  }
  // Faint tile grout lines.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= 1280; x += TILE) { ctx.moveTo(x, 52); ctx.lineTo(x, 720); }
  for (let y = 52; y <= 720; y += TILE) { ctx.moveTo(0, y); ctx.lineTo(1280, y); }
  ctx.stroke();
}

function drawWalls(ctx, level) {
  const t = level.theme;
  for (const w of level.walls) {
    ctx.fillStyle = t.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = t.trim;
    if (w.h <= 20) ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
    else ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
  }
}

function drawProps(ctx, level) {
  for (const p of level.props) {
    const { x, y, w, h } = p;
    if (p.kind === 'painting') {
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = '#5a2d3a';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'scroll' || p.kind === 'safe') {
      ctx.fillStyle = p.kind === 'safe' ? '#3d5266' : '#8a6b3f';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      if (p.kind === 'safe') {
        ctx.fillStyle = '#c8d4e0';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.kind === 'desk') {
      ctx.fillStyle = '#6b4a26';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f0e6cc';
      ctx.fillRect(x + 12, y + 10, 34, 22);
      ctx.fillRect(x + w - 52, y + h - 26, 34, 16);
    } else if (p.kind === 'crate') {
      ctx.fillStyle = '#7a5a2e';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#4a3416';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
    } else if (p.kind === 'plant') {
      ctx.fillStyle = '#2e5d33';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d46';
      ctx.beginPath();
      ctx.arc(x + w / 2 - 4, y + h / 2 - 4, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'case') {
      ctx.fillStyle = '#22303e';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(160, 210, 255, 0.35)';
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'bench') {
      ctx.fillStyle = '#5c2a2a';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#8a3a3a';
      ctx.fillRect(x, y, w, 6);
    } else if (p.kind === 'statue') {
      ctx.fillStyle = '#8f8578';
      ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
      ctx.fillStyle = '#cfc4ae';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w / 2 - 4, y + 2, 8, h * 0.4);
    }
  }
}

function drawShadowsAndLamps(ctx, level) {
  // Shadow patches: deep dark, readable at a glance — but light enough
  // that the sneaking thief still reads inside them.
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(2, 2, 8, 0.48)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(120, 140, 220, 0.18)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
  // Lamp pools: warm radial light.
  for (const l of level.lamps) {
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    g.addColorStop(0, level.theme.lamp === '#9fd8ff' ? 'rgba(159,216,255,0.34)' : 'rgba(255,200,110,0.30)');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    // The lamp fixture itself.
    ctx.fillStyle = '#3a2f1c';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, state) {
  const level = state.level;
  const e = level.exit;
  const taken = level.relics.filter((r) => r.taken).length;
  const open = state.exitUnlocked;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  // Glow.
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
  glow.addColorStop(0, open ? 'rgba(61,220,90,0.55)' : 'rgba(224,43,43,0.35)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.fill();
  // Door.
  ctx.fillStyle = open ? '#1f7a33' : '#5a1f1f';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#3ddc5a' : '#e02b2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  // Label, placed away from the door edge so it never sits under the minimap.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelY = e.y < 200 ? e.y + e.h + 22 : e.y - 22;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = open ? '#3ddc5a' : '#ff7070';
  ctx.fillText(open ? 'EXIT — OPEN' : `EXIT LOCKED · ${level.relics.length - taken} relic${level.relics.length - taken === 1 ? '' : 's'} left`, cx, labelY);
}

function drawRelics(ctx, level, time) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const r of level.relics) {
    if (r.taken) continue;
    const bob = Math.sin(time * 2 + r.x) * 3;
    const glow = ctx.createRadialGradient(r.x, r.y + bob, 2, r.x, r.y + bob, 34);
    glow.addColorStop(0, 'rgba(255,210,77,0.6)');
    glow.addColorStop(1, 'rgba(255,210,77,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(r.x, r.y + bob, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd24d';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + bob - 11);
    ctx.lineTo(r.x + 9, r.y + bob);
    ctx.lineTo(r.x, r.y + bob + 11);
    ctx.lineTo(r.x - 9, r.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a5a00';
    ctx.beginPath();
    ctx.arc(r.x, r.y + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillStyle = '#ffd24d';
    // Near the bottom edge the name goes above the diamond, so it never
    // collides with the minimap or the controls hint.
    const labelY = r.y > 600 ? r.y + bob - 26 : r.y + bob + 26;
    ctx.fillText(r.name.toUpperCase(), r.x, labelY);
  }
}

function drawFuse(ctx, level) {
  const f = level.fuse;
  if (!f || f.used) return;
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.fillRect(f.x - 14, f.y - 18, 28, 36);
  ctx.strokeStyle = '#ffd24d';
  ctx.lineWidth = 2;
  ctx.strokeRect(f.x - 14, f.y - 18, 28, 36);
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡', f.x, f.y + 1);
  ctx.font = 'bold 11px Georgia, serif';
  // Near the bottom edge the label goes above the box, clear of the minimap.
  ctx.fillText('FUSE BOX', f.x, f.y > 600 ? f.y - 32 : f.y + 32);
  ctx.restore();
}

function drawCone(ctx, poly, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCones(ctx, state) {
  const level = state.level;
  const blockers = [...level.walls, ...level.tall];
  for (const g of state.guards) {
    const poly = castCone(g.x, g.y, g.dir, g.half, g.range, blockers);
    const fill = g.state === 'alert' ? 'rgba(255,60,60,0.30)'
      : g.state === 'suspicious' || g.state === 'search' ? 'rgba(255,170,60,0.28)'
      : 'rgba(255,220,90,0.20)';
    drawCone(ctx, poly, fill, 'rgba(255,220,90,0.25)');
  }
  for (const c of state.cameras) {
    if (c.disabled) continue;
    const poly = castCone(c.x, c.y, c.angle, c.half, c.range, blockers);
    const fill = c.lock > 0.5 ? 'rgba(255,80,80,0.30)' : 'rgba(110,216,255,0.22)';
    drawCone(ctx, poly, fill, 'rgba(110,216,255,0.3)');
  }
}

function drawPatrolRoutes(ctx, state) {
  ctx.save();
  ctx.setLineDash([2, 8]);
  ctx.strokeStyle = 'rgba(160, 180, 255, 0.28)';
  ctx.lineWidth = 1.5;
  for (const g of state.guards) {
    if (g.kind === 'sentry' || g.waypoints.length < 2) continue;
    ctx.beginPath();
    g.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawGuard(ctx, g, time) {
  const bob = Math.sin(g.walkPhase) * 1.5;
  const body = g.kind === 'elite' ? '#7a1f2b' : g.kind === 'sentry' ? '#3d4a5c' : '#2c4a7a';
  const trim = g.kind === 'elite' ? '#ff8080' : '#9fc3ff';
  // Feet (walk animation).
  ctx.fillStyle = '#101018';
  const fx = Math.cos(g.dir);
  const fy = Math.sin(g.dir);
  const px = -fy;
  const py = fx;
  const step = Math.sin(g.walkPhase) * 5;
  ctx.beginPath();
  ctx.arc(g.x + px * 6 + fx * step, g.y + py * 6 + fy * step, 4, 0, Math.PI * 2);
  ctx.arc(g.x - px * 6 - fx * step, g.y - py * 6 - fy * step, 4, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(g.x, g.y + bob * 0.3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Helmet brim + facing tick.
  ctx.fillStyle = '#d8d2c4';
  ctx.beginPath();
  ctx.arc(g.x + fx * 6, g.y + fy * 6 + bob * 0.3, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath();
  ctx.arc(g.x + fx * 19, g.y + fy * 19, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Elite gets a red sash.
  if (g.kind === 'elite') {
    ctx.strokeStyle = '#ffd24d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x - 8, g.y - 8);
    ctx.lineTo(g.x + 8, g.y + 8);
    ctx.stroke();
  }
  // Suspicion arc over the guard.
  if (g.suspicion > 0.03 && g.state !== 'alert') {
    ctx.strokeStyle = g.suspicion >= 0.5 ? '#ff9a3d' : '#ffd24d';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  // Big readable "?" / "!".
  if (g.state === 'alert') {
    const pop = 1 + Math.sin(time * 10) * 0.08 + g.flash * 0.5;
    ctx.font = `bold ${Math.round(30 * pop)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff2b2b';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText('!', g.x, g.y - 32);
    ctx.fillText('!', g.x, g.y - 32);
  } else if (g.state === 'suspicious' || g.state === 'search') {
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb347';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText('?', g.x, g.y - 30);
    ctx.fillText('?', g.x, g.y - 30);
  }
}

function drawCamera(ctx, c, time) {
  if (c.disabled) {
    ctx.fillStyle = '#333';
    ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(c.x - 8, c.y - 8, 16, 16);
    return;
  }
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(c.x - 9, c.y - 9, 18, 18);
  ctx.strokeStyle = '#6fd8ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x - 9, c.y - 9, 18, 18);
  // Lens points along the cone.
  ctx.fillStyle = c.lock > 0.5 ? '#ff4040' : '#6fd8ff';
  ctx.beginPath();
  ctx.arc(c.x + Math.cos(c.angle) * 8, c.y + Math.sin(c.angle) * 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // Lock arc.
  if (c.lock > 0.03) {
    ctx.strokeStyle = c.lock > 0.5 ? '#ff4040' : '#6fd8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 15, -Math.PI / 2, -Math.PI / 2 + c.lock * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, p) {
  const crouch = p.sneaking ? 0.72 : 1;
  const bob = p.moving ? Math.sin(p.walkPhase) * 1.5 : Math.sin(Date.now() / 500) * 0.5;
  // Cloak.
  ctx.fillStyle = '#241a33';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + bob * 0.3, 13, 13 * crouch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6fc0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood + face shadow.
  ctx.fillStyle = '#17102a';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 3, p.y + Math.sin(p.dir) * 3 + bob * 0.3, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d8a8';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 5, p.y + Math.sin(p.dir) * 5 + bob * 0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Sneak = a faint "hidden" ring when crouched.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Click-to-move marker.
  if (p.moveTarget) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.moveTarget.x, p.moveTarget.y, 8, 0, Math.PI * 2);
    ctx.moveTo(p.moveTarget.x - 12, p.moveTarget.y);
    ctx.lineTo(p.moveTarget.x + 12, p.moveTarget.y);
    ctx.moveTo(p.moveTarget.x, p.moveTarget.y - 12);
    ctx.lineTo(p.moveTarget.x, p.moveTarget.y + 12);
    ctx.stroke();
  }
}

function drawToast(ctx, state) {
  if (!state.toast || state.toastTimer <= 0) return;
  const alpha = Math.min(1, state.toastTimer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(state.toast).width + 36;
  ctx.fillStyle = 'rgba(8, 8, 14, 0.88)';
  ctx.fillRect(640 - w / 2, 66, w, 34);
  ctx.strokeStyle = '#e8b64c';
  ctx.strokeRect(640 - w / 2, 66, w, 34);
  ctx.fillStyle = '#ffd24d';
  ctx.fillText(state.toast, 640, 84);
  ctx.restore();
}

function drawAlertPulse(ctx, state, time) {
  const anyAlert = state.guards.some((g) => g.state === 'alert');
  const intensity = anyAlert ? 0.55 : state.alarm >= 80 ? 0.45 : state.alarm / 100 * 0.3;
  if (intensity <= 0.01) return;
  const pulse = 0.6 + 0.4 * Math.sin(time * 6);
  const a = intensity * pulse;
  const grad = ctx.createRadialGradient(640, 386, 300, 640, 386, 720);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(1, `rgba(255,20,20,${a.toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 52, 1280, 668);
  // Hard red frame.
  ctx.strokeStyle = `rgba(255,30,30,${(a * 0.9).toFixed(3)})`;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 57, 1270, 658);
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 386, 320, 640, 386, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 52, 1280, 668);
}

/** Draw the whole world for the current state. */
export function drawWorld(ctx, state, time) {
  const level = state.level;
  drawFloor(ctx, level);
  drawProps(ctx, level);
  drawShadowsAndLamps(ctx, level);
  drawWalls(ctx, level);
  drawExit(ctx, state);
  drawRelics(ctx, level, time);
  drawFuse(ctx, level);
  drawPatrolRoutes(ctx, state);
  drawCones(ctx, state);
  // Tall cover drawn after cones so shelves read as solid objects.
  // A statue plinth keeps its statue look instead of the shelf texture.
  for (const t of level.tall) {
    const isStatue = level.props.some((p) => p.kind === 'statue' && p.x === t.x && p.y === t.y);
    if (isStatue) {
      ctx.fillStyle = '#8f8578';
      ctx.fillRect(t.x - 3, t.y - 3, t.w + 6, t.h + 6);
      ctx.fillStyle = '#cfc4ae';
      ctx.beginPath();
      ctx.arc(t.x + t.w / 2, t.y + t.h / 2, t.w * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(t.x + t.w / 2 - 4, t.y + 2, 8, t.h * 0.4);
      continue;
    }
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.strokeStyle = '#8a6b3f';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x + 2, t.y + 2, t.w - 4, t.h - 4);
    ctx.strokeStyle = 'rgba(255,220,150,0.25)';
    ctx.beginPath();
    for (let x = t.x + 14; x < t.x + t.w; x += 28) {
      ctx.moveTo(x, t.y + 4);
      ctx.lineTo(x, t.y + t.h - 4);
    }
    ctx.stroke();
  }
  for (const c of state.cameras) drawCamera(ctx, c, time);
  for (const g of state.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, state.player);
  drawVignette(ctx);
  drawAlertPulse(ctx, state, time);
  drawToast(ctx, state);
}
