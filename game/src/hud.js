// hud.js — the heads-up display and the title / pause / end screens.
// The HUD lives in the top bar; the minimap owns the bottom-left corner, so
// nothing else is drawn down there. End screens are translucent on purpose:
// the level stays visible behind the banner.

export function drawTopBar(ctx, state) {
  const level = state.level;
  const taken = level.relics.filter((r) => r.taken).length;
  const total = level.relics.length;
  const runTaken = state.runRelicsTaken;
  const runTotal = state.runRelicsTotal;

  ctx.save();
  // Bar background.
  ctx.fillStyle = 'rgba(8, 8, 14, 0.92)';
  ctx.fillRect(0, 0, 1280, 52);
  ctx.fillStyle = level.theme.trim;
  ctx.fillRect(0, 52, 1280, 2);

  // Level name + objective (left).
  ctx.fillStyle = '#f5ead0';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.name, 16, 17);
  ctx.fillStyle = '#cbb98a';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(level.objective, 16, 38);

  // Relics (centre-left): this level and the whole run.
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(`◆ RELICS ${taken}/${total}   ·   RUN ${runTaken}/${runTotal}`, 560, 26);

  // Timer (centre-right).
  const t = Math.floor(state.time);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  ctx.fillStyle = '#f5ead0';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`TIME ${mm}:${ss}`, 905, 26);

  // Alarm bar (right).
  const ax = 1010;
  const ay = 14;
  const aw = 200;
  const ah = 16;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5ead0';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('ALARM', ax, ay - 1);
  ctx.fillStyle = '#2a2a33';
  ctx.fillRect(ax + 58, ay, aw - 58, ah);
  const frac = state.alarm / 100;
  ctx.fillStyle = frac < 0.5 ? '#e8a33d' : frac < 0.8 ? '#e86a2d' : '#e02b2b';
  ctx.fillRect(ax + 58, ay, (aw - 58) * frac, ah);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(ax + 58, ay, aw - 58, ah);
  if (state.alarm >= 80) {
    ctx.fillStyle = '#ff5b5b';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('LOCKDOWN IMMINENT', ax + 58, ay + 28);
  }
  ctx.restore();
}

/** Small controls hint, bottom-right — far from the minimap. */
export function drawControlsHint(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(245, 234, 208, 0.55)';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASD / arrows move · click floor to walk · Shift sneak · P pause · R restart · M mute', 1264, 708);
  ctx.restore();
}

function panel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 10, 0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  const w = 640;
  const h = 150 + lines.length * 30;
  const x = (1280 - w) / 2;
  const y = (720 - h) / 2;
  ctx.fillStyle = 'rgba(16, 14, 24, 0.96)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(title, 640, y + 58);
  ctx.fillStyle = '#f5ead0';
  ctx.font = '16px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, y + 104 + i * 30));
  ctx.restore();
}

export function drawTitle(ctx) {
  panel(ctx, 'NIGHT SHIFT', [
    'THE GRAND HEIST',
    'Three floors. Five relics. One night.',
    'Slip past the guards — stay out of their cones, hide in the dark,',
    'cut the camera fuse boxes, and reach the glowing exit unseen.',
    'WASD / arrows or click to move · Shift to sneak · P pause · R restart · M mute',
    'Press ENTER or click to begin the heist',
  ], '#e8b64c');
}

export function drawPaused(ctx) {
  panel(ctx, 'PAUSED', [
    'The guards wait. The night does not.',
    'Press P to keep sneaking · R to restart the floor',
  ], '#cbb98a');
}

export function drawLevelClear(ctx, state) {
  const next = state.levelIndex + 1;
  panel(ctx, 'FLOOR CLEARED', [
    `${state.level.name} — all relics secured.`,
    next < 3 ? `The stairs down to floor ${next + 1} are open.` : '',
    'Press ENTER to keep going',
  ], '#7ddc7d');
}

export function drawWin(ctx, state) {
  panel(ctx, 'THE GRAND HEIST — COMPLETE', [
    'All five relics. All three floors. Not a single alarm that mattered.',
    `Finished in ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} — the museum never knew you were there.`,
    'Press R to run it again',
  ], '#ffd24d');
}

export function drawCaught(ctx, state) {
  panel(ctx, 'CAUGHT', [
    state.caughtReason || 'A guard got a hand on you.',
    'The museum locks down. The night is over — for now.',
    'Press R to try the floor again',
  ], '#ff5b5b');
}
