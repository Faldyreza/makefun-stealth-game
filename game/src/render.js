// render.js — canvas drawing: the noir museum, silhouettes, lamp pools,
// moon shafts, flashlight cones, relics, exit, dust motes in the light.

import { LEVEL, PLATFORMS, PIPES, VENTS, COVER, LAMPS, MOON_SHAFTS, EXIT } from './level.js';
import { drawDarkness } from './lighting.js';

const WALL_TOP = '#101019';
const WALL_BOTTOM = '#1b1424';
const FLOOR = '#241c2e';
const GOLD = '#d8b25e';
const LAMP_GLOW = '#ffca6a';

let lightCanvas = null;

function ensureLightCanvas(w, h) {
  if (!lightCanvas || lightCanvas.width !== w || lightCanvas.height !== h) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = w; lightCanvas.height = h;
  }
  return lightCanvas;
}

export function drawScene(ctx, state, time) {
  const W = LEVEL.width, H = LEVEL.height;
  const { player, guards, relics, cones } = state;

  // --- back wall: near-black with a faint warm gradient and tall arches
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, WALL_TOP);
  wall.addColorStop(1, WALL_BOTTOM);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  // Arched windows high on the wall, moonlight behind them.
  ctx.fillStyle = '#0e1424';
  for (const sx of [380, 920]) {
    ctx.beginPath();
    ctx.moveTo(sx - 42, 130);
    ctx.lineTo(sx - 42, 40);
    ctx.quadraticCurveTo(sx, -10, sx + 42, 40);
    ctx.lineTo(sx + 42, 130);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#24365e';
    ctx.fillRect(sx - 34, 46, 68, 80);
    ctx.fillStyle = '#0e1424';
  }
  // Faint wall panelling lines.
  ctx.strokeStyle = 'rgba(216,178,94,0.07)';
  ctx.lineWidth = 2;
  for (let x = 80; x < W; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 600); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(W, 150); ctx.stroke();

  // --- lamps: brass fixtures with a warm glow halo (drawn before darkness)
  for (const lamp of LAMPS) {
    const flick = 1 - lamp.flicker * 0.4 * Math.sin(time * 0.011 + lamp.x);
    ctx.strokeStyle = '#3a2f1d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lamp.x, 0); ctx.lineTo(lamp.x, lamp.y - 8); ctx.stroke();
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 90 * flick);
    g.addColorStop(0, 'rgba(255,202,106,0.85)');
    g.addColorStop(0.4, 'rgba(255,180,80,0.25)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 90 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c2214';
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = LAMP_GLOW;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y + 2, 5, 0, Math.PI * 2); ctx.fill();
  }

  // --- moon shafts (pale, drawn under the darkness veil)
  for (const shaft of MOON_SHAFTS) {
    const grad = ctx.createLinearGradient(shaft.x, 0, shaft.x + 400 * shaft.angle, H);
    grad.addColorStop(0, 'rgba(140,170,230,0.20)');
    grad.addColorStop(1, 'rgba(140,170,230,0.03)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(shaft.x - shaft.width / 2, 0);
    ctx.lineTo(shaft.x + shaft.width / 2, 0);
    ctx.lineTo(shaft.x + shaft.width / 2 + H * shaft.angle, H);
    ctx.lineTo(shaft.x - shaft.width / 2 + H * shaft.angle, H);
    ctx.closePath();
    ctx.fill();
  }

  // --- platforms, floor, pipes, vents, cover
  for (const p of PLATFORMS) {
    if (p.floor) {
      ctx.fillStyle = FLOOR;
      ctx.fillRect(0, p.y, W, H - p.y);
      ctx.fillStyle = '#2a2133';
      ctx.fillRect(0, p.y, W, 6);
      ctx.fillStyle = 'rgba(216,178,94,0.18)';
      for (let x = 30; x < W; x += 90) ctx.fillRect(x, p.y + 30, 46, 3);
    } else {
      ctx.fillStyle = '#241d2f';
      ctx.fillRect(p.x, p.y, p.w, 14);
      ctx.fillStyle = '#3a2f45';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillStyle = '#171221';
      ctx.fillRect(p.x + 8, p.y + 14, 6, 26);
      ctx.fillRect(p.x + p.w - 14, p.y + 14, 6, 26);
    }
  }
  for (const pipe of PIPES) {
    ctx.strokeStyle = '#4a3f55';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(pipe.x, pipe.yTop); ctx.lineTo(pipe.x, pipe.yBottom); ctx.stroke();
    ctx.strokeStyle = '#6b5a78';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pipe.x - 3, pipe.yTop); ctx.lineTo(pipe.x - 3, pipe.yBottom); ctx.stroke();
  }
  for (const v of VENTS) {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = '#332a40';
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = '#241d2e';
    ctx.lineWidth = 2;
    for (let x = v.x + 12; x < v.x + v.w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, v.y + 4); ctx.lineTo(x, v.y + v.h - 4); ctx.stroke();
    }
  }
  for (const c of COVER) {
    if (c.kind === 'crate') {
      ctx.fillStyle = '#2e2118';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#4a3520';
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h); ctx.stroke();
    } else {
      ctx.fillStyle = '#1c1626';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#2c2338';
      ctx.fillRect(c.x - 4, c.y, c.w + 8, 10);
      ctx.fillRect(c.x - 4, c.y + c.h - 10, c.w + 8, 10);
    }
  }

  // --- relics: glowing treasures in the dark
  for (const r of relics) {
    if (r.taken) continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.004 + r.x);
    const g = ctx.createRadialGradient(r.x, r.y, 2, r.x, r.y, 46 * pulse);
    g.addColorStop(0, r.color);
    g.addColorStop(0.35, r.color + '55');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(r.x, r.y, 46 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.color;
    ctx.beginPath(); ctx.arc(r.x, r.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, Math.PI * 2); ctx.fill();
    // The name is drawn after the cones (see the second pass below) so a
    // flashlight beam never washes it out.
  }

  // --- exit: a lit doorway, locked until all relics are taken
  const open = state.relicsTaken >= 3;
  const ex = EXIT;
  const eg = ctx.createRadialGradient(ex.x + ex.w / 2, ex.y + ex.h / 2, 4, ex.x + ex.w / 2, ex.y + ex.h / 2, 170);
  eg.addColorStop(0, open ? 'rgba(255,214,106,0.95)' : 'rgba(190,140,60,0.55)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.arc(ex.x + ex.w / 2, ex.y + ex.h / 2, 170, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = open ? '#ffd76a' : '#5a4a28';
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(ex.x + 8, ex.y + 8, ex.w - 16, ex.h - 8);
  if (open) {
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(ex.x + 14, ex.y + 14, ex.w - 28, ex.h - 20);
    ctx.fillStyle = '#0a0a12';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + 26);
  } else {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', ex.x + ex.w / 2, ex.y - 12);
    ctx.fillText(`${state.relicsTaken}/3 RELICS`, ex.x + ex.w / 2, ex.y + ex.h + 18);
  }

  // --- guards: dark silhouettes with a bright flashlight cone
  for (const g of guards) {
    drawGuard(ctx, g, time);
  }

  // --- the thief: a lean silhouette with a pale scarf edge
  drawPlayer(ctx, player, time);

  // --- flashlight cones as visible light (drawn over the scene, under darkness)
  for (const cone of cones) {
    const tipX = cone.x + Math.cos(cone.angle) * cone.range;
    const tipY = cone.y + Math.sin(cone.angle) * cone.range;
    const spread = Math.tan(cone.half) * cone.range;
    const px = -Math.sin(cone.angle) * spread, py = Math.cos(cone.angle) * spread;
    const cg = ctx.createLinearGradient(cone.x, cone.y, tipX, tipY);
    cg.addColorStop(0, 'rgba(255,240,180,0.34)');
    cg.addColorStop(1, 'rgba(255,240,180,0.02)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(cone.x, cone.y);
    ctx.lineTo(tipX + px, tipY + py);
    ctx.lineTo(tipX - px, tipY - py);
    ctx.closePath();
    ctx.fill();
  }

  // --- dust motes drifting in the light shafts
  ctx.fillStyle = 'rgba(255,230,170,0.5)';
  for (let i = 0; i < 26; i++) {
    const mx = (380 + ((i * 137) % 90) + Math.sin(time * 0.0004 + i) * 8 + (i % 2 ? 540 : 0)) % W;
    const my = (i * 53 + time * 0.02) % 620;
    ctx.fillRect(mx, my, 2, 2);
  }

  // Relic names, drawn over the cones so they stay legible.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  for (const r of relics) {
    if (!r.taken) ctx.fillText(r.name, r.x, r.y - 20);
  }

  // --- the darkness veil: light cuts holes in it
  drawDarkness(ctx, cones, time, W, H, ensureLightCanvas(W, H));

  // Exit label redrawn over the veil so it stays readable in the dark.
  if (!open) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', ex.x + ex.w / 2, ex.y - 12);
    ctx.fillText(`${state.relicsTaken}/3 RELICS`, ex.x + ex.w / 2, ex.y + ex.h + 18);
  } else {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + 26);
  }

  // Noise ring around the thief when loud (guards can hear it).
  if (player.noisePulse > 0.25) {
    ctx.strokeStyle = `rgba(255,120,90,${player.noisePulse * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.h / 2, 26 + player.noisePulse * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuard(ctx, g, time) {
  const x = g.x, y = g.y;
  const alert = g.state === 'chase';
  const sus = g.suspicion >= 35;
  // Body: tall dark silhouette, coat and cap brim, with a faint rim light
  // on the side the flashlight faces so guards read against the floor.
  ctx.fillStyle = alert ? '#33121a' : '#1b1b2c';
  ctx.beginPath();
  ctx.moveTo(x - 11, y);
  ctx.lineTo(x - 12, y - 40);
  ctx.lineTo(x - 7, y - 48);
  ctx.lineTo(x + 7, y - 48);
  ctx.lineTo(x + 12, y - 40);
  ctx.lineTo(x + 11, y);
  ctx.closePath();
  ctx.fill();
  // Head + cap.
  ctx.fillStyle = '#0c0c14';
  ctx.beginPath(); ctx.arc(x, y - 54, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 12, y - 62, 24, 4);
  // Flashlight in the leading hand.
  const handX = x + g.dir * 13, handY = y - 34;
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(handX - 4, handY - 3, 10, 6);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(handX + g.dir * 6, handY, 3, 0, Math.PI * 2); ctx.fill();
  // Walking bob.
  const bob = g.state === 'patrol' ? Math.sin(time * 0.012 + g.id * 3) * 1.5 : 0;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(x - 10, y - 2 + bob, 7, 2);
  ctx.fillRect(x + 3, y - 2 - bob, 7, 2);
  // State mark: "?" amber, "!" red, with a glow.
  if (alert || sus) {
    const mark = alert ? '!' : '?';
    const col = alert ? '#ff4d4d' : '#ffb84d';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(mark, x, y - 74 + Math.sin(time * 0.008) * 2);
  }
}

function drawPlayer(ctx, p, time) {
  const x = p.x, y = p.y;
  const h = p.h;
  const crouch = p.crawling ? 0.55 : 1;
  const runBob = p.moving && p.onGround ? Math.sin(time * 0.02) * 2 : 0;
  // Cloak silhouette.
  ctx.fillStyle = '#0d0d16';
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 11, y - h * 0.75 * crouch);
  ctx.quadraticCurveTo(x, y - h * crouch - 6, x + 11, y - h * 0.75 * crouch);
  ctx.lineTo(x + 10, y);
  ctx.closePath();
  ctx.fill();
  // Hood + pale scarf edge so the thief reads against the dark.
  ctx.fillStyle = '#1a1a28';
  ctx.beginPath(); ctx.arc(x, y - h * crouch - 2, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.hidden ? '#b9c8e8' : '#ffd76a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y - h * crouch - 2, 8, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Eyes: two faint glints.
  ctx.fillStyle = '#dfe8ff';
  ctx.fillRect(x + p.facing * 3 - 1, y - h * crouch - 4, 2, 2);
  // Feet.
  ctx.fillStyle = '#05050a';
  ctx.fillRect(x - 9, y - 3 + runBob, 6, 3);
  ctx.fillRect(x + 3, y - 3 - runBob, 6, 3);
  // Sneak pose hint: a small "shh" crouch line.
  if (p.sneaking || p.crawling) {
    ctx.fillStyle = 'rgba(143,163,200,0.8)';
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.crawling ? 'crawling' : 'sneaking', x, y - h * crouch - 16);
  }
}
