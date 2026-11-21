// render.js — draws the whole archive on one canvas: floor, lamplight, shadows,
// cover, keys, exit, guards with their vision cones, and the hooded thief.
// All art is drawn in code; there are no image assets.

import {
  EXIT,
  KEY_SPOTS,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  LIGHTS,
  SHADOWS,
  SOLIDS,
  WALL,
} from './level.js';
import { CONE_HALF_ANGLE, CONE_RANGE } from './guard.js';

const TILE = 40;

function coneColor(suspicion) {
  // Calm yellow -> worried orange -> alarmed red as the meter fills.
  if (suspicion < 0.35) return '255, 214, 90';
  if (suspicion < 0.7) return '255, 158, 60';
  return '255, 72, 60';
}

export function drawGame(ctx, state) {
  const { player, guards, keys, alarm, time } = state;
  ctx.clearRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

  drawFloor(ctx, time);
  drawLights(ctx, time);
  drawShadows(ctx);
  drawExit(ctx, player.keys >= KEY_SPOTS.length, time);
  drawKeys(ctx, keys, time);
  drawSolids(ctx);
  drawCones(ctx, guards);
  drawGuards(ctx, guards, time);
  drawPlayer(ctx, player, time);
  drawAlarmVignette(ctx, alarm);
}

function drawFloor(ctx, time) {
  ctx.fillStyle = '#141728';
  ctx.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  // Checkerboard tiles, faint enough to read as a floor at night.
  for (let y = 0; y < LEVEL_HEIGHT / TILE; y++) {
    for (let x = 0; x < LEVEL_WIDTH / TILE; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.022)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  // Grout lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= LEVEL_WIDTH; x += TILE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LEVEL_HEIGHT);
  }
  for (let y = 0; y <= LEVEL_HEIGHT; y += TILE) {
    ctx.moveTo(0, y);
    ctx.lineTo(LEVEL_WIDTH, y);
  }
  ctx.stroke();
  // A faded compass rose in the middle of the floor, for orientation.
  ctx.save();
  ctx.translate(640, 360);
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffd97a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(0, 46);
  ctx.moveTo(-46, 0);
  ctx.lineTo(46, 0);
  ctx.stroke();
  ctx.restore();
}

function drawLights(ctx, time) {
  // Warm lamplight pools. They pulse almost imperceptibly, like old bulbs.
  for (const l of LIGHTS) {
    const pulse = 0.10 + Math.sin(time * 1.4 + l.x) * 0.012;
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    g.addColorStop(0, `rgba(255, 196, 110, ${pulse + 0.05})`);
    g.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    // The lamp itself: a small brass dot on the floor.
    ctx.fillStyle = '#c9a35a';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShadows(ctx) {
  // Dark zones: visibly darker floor where the meter fills slowly.
  for (const s of SHADOWS) {
    ctx.fillStyle = 'rgba(2, 3, 8, 0.5)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(120, 140, 190, 0.14)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
}

function drawExit(ctx, open, time) {
  const glow = open ? 0.55 + Math.sin(time * 4) * 0.2 : 0.22;
  const cx = EXIT.x + EXIT.w / 2;
  const cy = EXIT.y + EXIT.h / 2;
  // Threshold: a glowing strip of floor leading into the doorway, so the
  // exit reads from across the room instead of hiding in the wall.
  const tg = ctx.createLinearGradient(EXIT.x - 32, 0, EXIT.x + EXIT.w, 0);
  tg.addColorStop(0, 'rgba(57, 255, 136, 0)');
  tg.addColorStop(1, open ? 'rgba(57, 255, 136, 0.4)' : 'rgba(46, 122, 74, 0.28)');
  ctx.fillStyle = tg;
  ctx.fillRect(EXIT.x - 32, EXIT.y, 32, EXIT.h);
  ctx.strokeStyle = open ? 'rgba(57, 255, 136, 0.55)' : 'rgba(77, 138, 100, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(EXIT.x - 32, EXIT.y, 32, EXIT.h);
  ctx.save();
  ctx.shadowColor = open ? '#39ff88' : '#2a7a4a';
  ctx.shadowBlur = open ? 26 : 10;
  ctx.fillStyle = open ? `rgba(57, 255, 136, ${glow})` : 'rgba(46, 122, 74, 0.5)';
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.restore();
  ctx.strokeStyle = open ? '#b6ffd2' : '#4d8a64';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  // Door split + vertical EXIT lettering, readable from the floor.
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.moveTo(EXIT.x, cy);
  ctx.lineTo(EXIT.x + EXIT.w, cy);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = open ? '#eafff1' : '#9fc7ad';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT ✓' : 'EXIT', 0, 0);
  ctx.restore();
  ctx.textAlign = 'right';
  if (open) {
    ctx.fillStyle = 'rgba(57, 255, 136, 0.95)';
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('OPEN — GO!', EXIT.x - 12, cy - 4);
    ctx.fillText('→', EXIT.x - 12, cy + 14);
  } else {
    ctx.fillStyle = 'rgba(160, 170, 190, 0.8)';
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('LOCKED', EXIT.x - 12, cy - 6);
    ctx.fillText('needs 3 keys', EXIT.x - 12, cy + 10);
  }
}

function drawKeys(ctx, keys, time) {
  for (const k of keys) {
    if (k.taken) continue;
    const bob = Math.sin(time * 2.4 + k.x) * 3;
    const y = k.y + bob;
    ctx.save();
    ctx.shadowColor = '#ffd97a';
    ctx.shadowBlur = 18;
    // A glowing archive document: pale paper with red seal.
    ctx.translate(k.x, y);
    ctx.rotate(Math.sin(time * 1.2 + k.x) * 0.08);
    ctx.fillStyle = '#f3e9c8';
    ctx.fillRect(-11, -14, 22, 28);
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-11, -14, 22, 28);
    ctx.strokeStyle = '#b09a5a';
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(7, -7);
    ctx.moveTo(-7, -1);
    ctx.lineTo(7, -1);
    ctx.moveTo(-7, 5);
    ctx.lineTo(2, 5);
    ctx.stroke();
    ctx.fillStyle = '#b03030';
    ctx.beginPath();
    ctx.arc(4, 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSolids(ctx) {
  for (const s of SOLIDS) {
    if (s.kind === 'wall') {
      ctx.fillStyle = '#232839';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2e3550';
      if (s.w > s.h) ctx.fillRect(s.x, s.y, s.w, 4);
      else ctx.fillRect(s.x, s.y, 4, s.h);
      continue;
    }
    if (s.kind === 'shelf' || s.kind === 'stack') {
      // Tall archive shelving: dark wood frame, rows of book spines.
      ctx.fillStyle = '#3a2c1c';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#241a10';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      const horizontal = s.w >= s.h;
      const count = Math.floor((horizontal ? s.w : s.h) / 14);
      for (let i = 0; i < count; i++) {
        const hue = ['#7a4a3a', '#4a6a7a', '#6a7a4a', '#8a6a3a', '#5a4a7a'][(i + s.x) % 5];
        ctx.fillStyle = hue;
        if (horizontal) {
          ctx.fillRect(s.x + 6 + i * 14, s.y + 6, 10, s.h - 12);
        } else {
          ctx.fillRect(s.x + 6, s.y + 6 + i * 14, s.w - 12, 10);
        }
      }
      ctx.strokeStyle = '#151009';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      continue;
    }
    if (s.kind === 'crate') {
      ctx.fillStyle = '#6a5230';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#7d6138';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = '#4a3820';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.beginPath();
      ctx.moveTo(s.x + 2, s.y + 2);
      ctx.lineTo(s.x + s.w - 2, s.y + s.h - 2);
      ctx.moveTo(s.x + s.w - 2, s.y + 2);
      ctx.lineTo(s.x + 2, s.y + s.h - 2);
      ctx.stroke();
      continue;
    }
    if (s.kind === 'pillar') {
      ctx.fillStyle = '#2b3049';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a4066';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2 - 4, s.y + s.h / 2 - 4, s.w / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCones(ctx, guards) {
  for (const g of guards) {
    const rgb = coneColor(g.suspicion);
    const alpha = g.state === 'chase' ? 0.42 : 0.33;
    const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, CONE_RANGE);
    grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    grad.addColorStop(1, `rgba(${rgb}, 0.03)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, CONE_RANGE, g.angle - CONE_HALF_ANGLE, g.angle + CONE_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    // Cone edge lines so the boundary reads at a glance.
    ctx.strokeStyle = `rgba(${rgb}, 0.65)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle - CONE_HALF_ANGLE) * CONE_RANGE, g.y + Math.sin(g.angle - CONE_HALF_ANGLE) * CONE_RANGE);
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle + CONE_HALF_ANGLE) * CONE_RANGE, g.y + Math.sin(g.angle + CONE_HALF_ANGLE) * CONE_RANGE);
    ctx.stroke();
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    // Soft shadow under the guard.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: navy uniform with a brass badge dot.
    ctx.fillStyle = g.state === 'chase' ? '#7a2020' : '#2c3a5e';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8fa3c8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cap brim pointing where they look.
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(
      g.x + Math.cos(g.angle) * 8,
      g.y + Math.sin(g.angle) * 8,
      7, 0, Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(g.x - Math.cos(g.angle) * 4, g.y - Math.sin(g.angle) * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Flashlight dot at the cone's origin.
    ctx.fillStyle = 'rgba(255, 230, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 15, g.y + Math.sin(g.angle) * 15, 2, 0, Math.PI * 2);
    ctx.fill();

    // Suspicion meter: a ring that fills around the guard, plus a bar when worried.
    if (g.suspicion > 0.02) {
      const rgb = coneColor(g.suspicion);
      ctx.strokeStyle = `rgba(${rgb}, 0.95)`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius + 7, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
      ctx.stroke();
      if (g.suspicion > 0.35) {
        ctx.fillStyle = '#0b0d16';
        ctx.fillRect(g.x - 22, g.y - g.radius - 22, 44, 8);
        ctx.fillStyle = `rgb(${rgb})`;
        ctx.fillRect(g.x - 21, g.y - g.radius - 21, 42 * g.suspicion, 6);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(g.x - 22, g.y - g.radius - 22, 44, 8);
      }
      if (g.suspicion > 0.7 && Math.sin(time * 10) > 0) {
        ctx.fillStyle = '#ff483c';
        ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - g.radius - 26);
      }
    }
    // State tag so the player can read intent: ? = suspicious, ! = chasing.
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff483c';
      ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - g.radius - 26);
    } else if (g.state === 'investigate' || g.state === 'search') {
      ctx.fillStyle = '#ffd97a';
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - g.radius - 26);
    }
  }
}

function drawPlayer(ctx, player, time) {
  const sway = player.moving ? Math.sin(player.bob) * 2 : Math.sin(time * 2) * 0.8;
  ctx.save();
  ctx.translate(player.x, player.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a dark teal hooded figure, drawn as a rounded triangle.
  // A pale rim keeps the thief readable against the dark floor.
  ctx.rotate(player.facing + Math.PI / 2);
  ctx.fillStyle = player.sneaking ? '#175047' : '#22755f';
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.quadraticCurveTo(11, -4, 10, 10);
  ctx.quadraticCurveTo(0, 14, -10, 10);
  ctx.quadraticCurveTo(-11, -4, 0, -13);
  ctx.fill();
  ctx.strokeStyle = '#8fe8c0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood point + face shadow.
  ctx.fillStyle = '#0f2e27';
  ctx.beginPath();
  ctx.arc(0, -5, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d9a8';
  ctx.beginPath();
  ctx.arc(0, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.fillStyle = 'rgba(125, 255, 158, 0.85)';
    ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', player.x, player.y - 22);
  }
  // Footstep ripple while moving, so motion reads on screen.
  if (player.moving) {
    ctx.strokeStyle = `rgba(232, 228, 216, ${0.25 - (player.bob % 1) * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 16 + sway, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAlarmVignette(ctx, alarm) {
  if (alarm <= 0.02) return;
  const g = ctx.createRadialGradient(640, 360, 260, 640, 360, 720);
  g.addColorStop(0, 'rgba(255, 40, 30, 0)');
  g.addColorStop(1, `rgba(255, 40, 30, ${alarm * 0.28})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
}
