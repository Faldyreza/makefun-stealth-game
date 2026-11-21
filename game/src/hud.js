// hud.js — the on-screen readouts, drawn on the same canvas as the game:
// relics and timer top-left, the alarm bar top-centre, a live minimap
// top-right, a fading controls hint at the start, and the small win /
// lose banners (kept at the top so they never cover the level centre).

import { WORLD_W, WORLD_H } from './level.js';

const MAP_W = 208;
const MAP_H = 117;
const MAP_X = WORLD_W - MAP_W - 14;
const MAP_Y = 14;

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(160, 175, 220, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawStatusPanel(ctx, relicsGot, elapsed, alarm, sneaking, inShadow) {
  drawPanel(ctx, 14, 14, 252, 66);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('RELICS  ' + relicsGot + ' / 5', 26, 38);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = '15px sans-serif';
  ctx.fillText('TIME  ' + fmtTime(elapsed), 26, 60);
  ctx.fillStyle = sneaking ? '#b9a5ff' : '#9fb2d8';
  ctx.font = '12px sans-serif';
  const state = inShadow ? 'IN SHADOW' : sneaking ? 'SNEAKING' : 'EXPOSED';
  ctx.fillText(state, 148, 60);

  // Alarm bar, top-centre.
  const barW = 320;
  const barX = (WORLD_W - barW) / 2;
  drawPanel(ctx, barX - 10, 14, barW + 20, 40);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', barX, 30);
  ctx.fillStyle = '#222838';
  ctx.fillRect(barX + 62, 20, barW - 62, 12);
  const alarmColor = alarm > 0.66 ? '#ff4d4d' : alarm > 0.33 ? '#ff9a3d' : '#ffd23e';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(barX + 62, 20, (barW - 62) * Math.min(1, alarm), 12);
  ctx.strokeStyle = 'rgba(160, 175, 220, 0.4)';
  ctx.strokeRect(barX + 62.5, 20.5, barW - 62, 12);
}

function drawMinimap(ctx, level, player, guards) {
  drawPanel(ctx, MAP_X - 6, MAP_Y - 6, MAP_W + 12, MAP_H + 26);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', MAP_X, MAP_Y + MAP_H + 12);
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.clip();
  ctx.fillStyle = '#141824';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.fillStyle = 'rgba(64, 110, 180, 0.25)';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W * 0.34, MAP_H);
  ctx.fillStyle = 'rgba(180, 150, 60, 0.25)';
  ctx.fillRect(MAP_X + MAP_W * 0.34, MAP_Y, MAP_W * 0.29, MAP_H);
  ctx.fillStyle = 'rgba(120, 70, 170, 0.25)';
  ctx.fillRect(MAP_X + MAP_W * 0.63, MAP_Y, MAP_W * 0.37, MAP_H);
  // Walls and tall cover.
  ctx.fillStyle = '#5a6480';
  for (const r of [...level.walls, ...level.shelves, ...level.pillars]) {
    ctx.fillRect(MAP_X + r.x * sx, MAP_Y + r.y * sy, Math.max(1, r.w * sx), Math.max(1, r.h * sy));
  }
  // Relics left to grab.
  for (const r of level.relics) {
    if (r.taken) continue;
    ctx.fillStyle = '#ffd65a';
    ctx.beginPath();
    ctx.arc(MAP_X + r.x * sx, MAP_Y + r.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Exit.
  ctx.fillStyle = level.exit.locked ? '#c05a5a' : '#4dff88';
  ctx.fillRect(MAP_X + level.exit.x * sx - 3, MAP_Y + level.exit.y * sy - 2, 7, 5);
  // Guards: red when alert, amber when suspicious, pale blue otherwise.
  for (const g of guards) {
    ctx.fillStyle = g.mode === 'chase' ? '#ff4d4d' : g.mode === 'investigate' ? '#ffd23e' : '#9fc0ff';
    ctx.beginPath();
    ctx.arc(MAP_X + g.x * sx, MAP_Y + g.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player: white, with a ring.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(MAP_X + player.x * sx, MAP_Y + player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8fa3d9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(MAP_X + player.x * sx, MAP_Y + player.y * sy, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHint(ctx, elapsed) {
  if (elapsed > 7) return;
  const alpha = elapsed > 5.5 ? (7 - elapsed) / 1.5 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  const text = 'WASD / arrows move  ·  SHIFT sneak  ·  click to walk  ·  P pause  ·  R restart  ·  M mute';
  ctx.font = '14px sans-serif';
  const w = ctx.measureText(text).width + 28;
  ctx.fillRect((WORLD_W - w) / 2, WORLD_H - 40, w, 26);
  ctx.fillStyle = '#dfe6ff';
  ctx.textAlign = 'center';
  ctx.fillText(text, WORLD_W / 2, WORLD_H - 22);
  ctx.restore();
}

function drawBanner(ctx, title, sub, color) {
  ctx.save();
  const w = 560;
  const x = (WORLD_W - w) / 2;
  const y = 96;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.88)';
  ctx.fillRect(x, y, w, 86);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, 84);
  ctx.fillStyle = color;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, WORLD_W / 2, y + 38);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = '15px sans-serif';
  ctx.fillText(sub, WORLD_W / 2, y + 64);
  ctx.restore();
}

export function drawHud(ctx, level, player, guards, state) {
  drawStatusPanel(ctx, state.relicsGot, state.elapsed, state.alarm, player.sneaking, level.inShadow(player.x, player.y));
  drawMinimap(ctx, level, player, guards);
  drawHint(ctx, state.elapsed);
  if (state.phase === 'won') {
    drawBanner(ctx, 'CLEAN GETAWAY!', 'All 5 relics pocketed in ' + fmtTime(state.elapsed) + '  —  press R to play again', '#4dff88');
  } else if (state.phase === 'lost') {
    drawBanner(ctx, 'CAUGHT!', state.loseReason + '  —  press R to try again', '#ff4d4d');
  } else if (state.phase === 'paused') {
    drawBanner(ctx, 'PAUSED', 'Press P to keep sneaking  ·  R to restart', '#9fb2d8');
  }
}
