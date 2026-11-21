// hud.js — the heads-up display: visibility eye + light meter, relic count,
// timer, alarm bar, and the title / pause / win / lose screens.
// Drawn in canvas so the screenshots carry the whole game.

import { LEVEL } from './level.js';

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function drawHUD(ctx, state, time) {
  const { player, relicsTaken, alarm, elapsed, muted } = state;

  // Top bar: title left, timer + relics right.
  ctx.fillStyle = 'rgba(5,5,10,0.55)';
  ctx.fillRect(0, 0, LEVEL.width, 44);
  ctx.fillStyle = '#d8b25e';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('NIGHT SHIFT — THE VAULT HEIST', 18, 28);
  ctx.fillStyle = '#cfc4a8';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`TIME ${fmtTime(elapsed)}`, LEVEL.width - 18, 20);
  ctx.fillText(`RELICS ${relicsTaken}/3`, LEVEL.width - 18, 38);

  // Visibility meter: an eye that opens in the light, closes in shadow.
  const light = player.light;
  const mx = 640, my = 26;
  ctx.fillStyle = 'rgba(5,5,10,0.6)';
  ctx.beginPath(); ctx.arc(mx, my, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = light > 0.55 ? '#ffd76a' : '#8fa3c8';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.stroke();
  // Eye: pupil size grows with light; a slash when hidden.
  ctx.fillStyle = light > 0.55 ? '#ff5d4d' : '#8fa3c8';
  ctx.beginPath(); ctx.arc(mx, my, 3 + light * 6, 0, Math.PI * 2); ctx.fill();
  if (light <= 0.25) {
    ctx.strokeStyle = '#8fa3c8';
    ctx.beginPath(); ctx.moveTo(mx - 11, my + 11); ctx.lineTo(mx + 11, my - 11); ctx.stroke();
  }
  ctx.fillStyle = light > 0.55 ? '#ffb84d' : '#9fb2d8';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(player.hidden ? 'HIDDEN' : light > 0.55 ? 'EXPOSED' : 'SEEN?', mx, my + 34);
  // Light bar under the eye.
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(mx - 40, my + 40, 80, 6);
  ctx.fillStyle = light > 0.55 ? '#ff5d4d' : light > 0.25 ? '#ffd76a' : '#5f7fb8';
  ctx.fillRect(mx - 40, my + 40, 80 * light, 6);

  // Alarm bar (bottom left) — fills as guards grow suspicious.
  ctx.fillStyle = 'rgba(5,5,10,0.6)';
  ctx.fillRect(14, LEVEL.height - 34, 220, 22);
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(18, LEVEL.height - 30, 160, 14);
  ctx.fillStyle = alarm > 70 ? '#ff4d4d' : alarm > 35 ? '#ffb84d' : '#5f7fb8';
  ctx.fillRect(18, LEVEL.height - 30, 160 * Math.min(1, alarm / 100), 14);
  ctx.fillStyle = '#cfc4a8';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', 184, LEVEL.height - 18);

  // Controls hint (bottom right).
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(207,196,168,0.75)';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('Arrows/WASD move · Up jump/climb · Shift sneak · C crawl · P pause · M mute', LEVEL.width - 14, LEVEL.height - 14);
  if (muted) ctx.fillText('MUTED', LEVEL.width - 14, LEVEL.height - 32);

  // Toast message (relic stolen, guard suspicious...).
  if (state.toast && time < state.toastUntil) {
    ctx.fillStyle = 'rgba(5,5,10,0.7)';
    const tw = ctx.measureText(state.toast).width + 30;
    ctx.fillRect(LEVEL.width / 2 - tw / 2, 100, tw, 30);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, LEVEL.width / 2, 120);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(3,3,8,0.78)';
  ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, LEVEL.width / 2, 250);
  ctx.fillStyle = '#e8ddc0';
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, LEVEL.width / 2, 300 + i * 30));
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Press R to play again · M to mute', LEVEL.width / 2, 300 + lines.length * 30 + 40);
}

export function drawTitle(ctx, state) {
  overlay(ctx, 'NIGHT SHIFT', [
    'THE VAULT HEIST — SHADOW EDITION',
    '',
    'Steal 3 relics. Stay in the dark. Reach the EXIT unseen.',
    'Light exposes you — shadow hides you. Watch the eye.',
    'Guards sweep flashlight cones: "?" means suspicious, "!" means run.',
    '',
    'Press any key to begin',
  ], '#d8b25e');
}

export function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['The hall waits in the dark.', '', 'P to resume · R to restart'], '#8fa3c8');
}

export function drawWin(ctx, state) {
  overlay(ctx, 'CLEAN GETAWAY', [
    `All 3 relics stolen in ${fmtTime(state.elapsed)}.`,
    `Times spotted: ${state.timesSpotted} · Closest call: ${state.closestCall}`,
    'The vault never saw you coming.',
  ], '#ffd76a');
}

export function drawLose(ctx, state) {
  overlay(ctx, 'CAUGHT', [
    'A guard laid hands on you in the light.',
    `Relics stolen: ${state.relicsTaken}/3 · Time: ${fmtTime(state.elapsed)}`,
    'The night shift ends in a cell.',
  ], '#ff5d4d');
}
