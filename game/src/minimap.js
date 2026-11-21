// minimap.js — the floor plan in the bottom-left corner.
// Small (170x96) and tucked into the corner so it never covers the exit,
// a relic, or any HUD text. Guards show as dots coloured by their state,
// relics as gold diamonds, the exit as a green (or red, locked) bar.

const MAP_W = 176;
const MAP_H = 100;
const MAP_X = 16;
const MAP_Y = 720 - MAP_H - 12; // 608

function mx(x) { return MAP_X + (x / 1280) * MAP_W; }
function my(y) { return MAP_Y + ((y - 52) / 668) * MAP_H; }

export function drawMinimap(ctx, state) {
  const level = state.level;
  ctx.save();
  // Frame.
  ctx.fillStyle = 'rgba(8, 8, 14, 0.85)';
  ctx.fillRect(MAP_X - 4, MAP_Y - 4, MAP_W + 8, MAP_H + 8);
  ctx.strokeStyle = level.theme.trim;
  ctx.lineWidth = 1;
  ctx.strokeRect(MAP_X - 4, MAP_Y - 4, MAP_W + 8, MAP_H + 8);

  // Walls and tall cover as dark blocks.
  ctx.fillStyle = 'rgba(200, 190, 160, 0.5)';
  for (const r of [...level.walls, ...level.tall]) {
    ctx.fillRect(mx(r.x), my(r.y), Math.max(1, (r.w / 1280) * MAP_W), Math.max(1, (r.h / 668) * MAP_H));
  }
  // Cameras as small cyan triangles.
  ctx.fillStyle = '#6fd8ff';
  for (const c of state.cameras) {
    if (c.disabled) continue;
    ctx.beginPath();
    ctx.moveTo(mx(c.x), my(c.y) - 3);
    ctx.lineTo(mx(c.x) - 3, my(c.y) + 3);
    ctx.lineTo(mx(c.x) + 3, my(c.y) + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Relics as gold diamonds.
  for (const r of level.relics) {
    if (r.taken) continue;
    ctx.fillStyle = '#ffd24d';
    const x = mx(r.x);
    const y = my(r.y);
    ctx.beginPath();
    ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
  }
  // Exit: green when open, red while locked.
  const e = level.exit;
  ctx.fillStyle = state.exitUnlocked ? '#3ddc5a' : '#e02b2b';
  ctx.fillRect(mx(e.x) - 2, my(e.y) - 2, Math.max(4, (e.w / 1280) * MAP_W + 4), Math.max(3, (e.h / 668) * MAP_H + 4));

  // Guards coloured by state: blue patrol, amber suspicious, red alert.
  for (const g of state.guards) {
    ctx.fillStyle = g.state === 'alert' ? '#ff4040'
      : g.state === 'suspicious' || g.state === 'search' ? '#ffb347' : '#7fa8ff';
    ctx.beginPath();
    ctx.arc(mx(g.x), my(g.y), g.state === 'alert' ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The thief: a white dot with a dark ring.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx(state.player.x), my(state.player.y), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  ctx.arc(mx(state.player.x), my(state.player.y), 3.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(245, 234, 208, 0.7)';
  ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', MAP_X, MAP_Y - 8);
  ctx.restore();
}
