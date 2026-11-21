// hud.js — the bright HUD: detection meter, timer, win/lose screens.
// One job: draw everything that is not the atrium itself, on the canvas.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Top bar: title, artifact diamonds, timer, alarm meter, detection eye.
export function drawHud(ctx, state) {
  const { player, guards, time, alarm } = state;
  ctx.fillStyle = 'rgba(255, 252, 240, 0.92)';
  roundRect(ctx, 12, 10, 1256, 52, 10);
  ctx.fill();
  ctx.strokeStyle = '#d9b380';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#7c2d12';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DAYLIGHT HEIST', 26, 44);
  ctx.fillStyle = '#5b4a2a';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('— THE ATRIUM JOB', 208, 44);

  // Artifact diamonds: gold when stolen, grey outline when still on show.
  for (let i = 0; i < 3; i++) {
    const cx = 430 + i * 34;
    const cy = 36;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = player.artifacts > i ? '#ffb703' : '#e7dcc3';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
  }
  ctx.fillStyle = '#5b4a2a';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillText(`${player.artifacts} / 3`, 540, 41);

  // Timer.
  ctx.fillStyle = '#1d2a4a';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.fillText(`⏱ ${formatTime(time)}`, 620, 42);

  // Detection eye: the highest guard suspicion right now.
  const worst = guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  const eyeColor = worst >= 0.85 ? '#dc2626' : worst >= 0.35 ? '#d97706' : '#2e9e5b';
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(800, 36, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(800, 36, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d2a4a';
  ctx.beginPath();
  ctx.arc(800, 36, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5b4a2a';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(worst >= 0.85 ? 'SPOTTED!' : worst >= 0.35 ? 'SUSPICIOUS' : 'HIDDEN', 830, 41);

  // Alarm meter: fills while any guard chases; full means the run is over.
  ctx.fillStyle = '#5b4a2a';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillText('ALARM', 1000, 41);
  ctx.fillStyle = '#e7dcc3';
  roundRect(ctx, 1060, 24, 180, 20, 10);
  ctx.fill();
  ctx.fillStyle = alarm > 0.6 ? '#dc2626' : '#f59e0b';
  if (alarm > 0.01) {
    roundRect(ctx, 1060, 24, 180 * Math.min(1, alarm), 20, 10);
    ctx.fill();
  }
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  roundRect(ctx, 1060, 24, 180, 20, 10);
  ctx.stroke();

  // Balcony tip: when the thief stands on the raised slab, say why it helps.
  if (player.onBalcony) {
    ctx.fillStyle = 'rgba(42, 157, 143, 0.92)';
    roundRect(ctx, 480, 66, 320, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BALCONY — guards spot you half as fast up here', 640, 83);
    ctx.textAlign = 'left';
  }
}

// Big centre overlay for title / pause / win / lose.
export function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(253, 246, 227, 0.88)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = accent;
  ctx.font = 'bold 52px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 300);
  ctx.fillStyle = '#5b4a2a';
  ctx.font = '20px "Trebuchet MS", sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 350 + i * 32));
  ctx.textAlign = 'left';
}
