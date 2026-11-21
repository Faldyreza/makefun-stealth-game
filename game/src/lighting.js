// lighting.js — the light/shadow map: darkness hides you, light exposes you.
// Lamp pools, moon shafts and guard flashlight cones are the only light.
// lightAt(x, y) returns 0 (pitch dark) .. 1 (fully lit) and drives both the
// visibility meter and the darkness overlay the player sees.

import { LAMPS, MOON_SHAFTS } from './level.js';

// Warm lamp glow: soft radial falloff around each lamp's pool on the floor.
function lampLight(x, y, lamp, time) {
  const flick = 1 - lamp.flicker * Math.sin(time * 0.011 + lamp.x) * Math.sin(time * 0.023 + lamp.x * 2);
  const dx = x - lamp.x;
  const dy = y - (lamp.y + 460); // the pool lands on the floor, not mid-air
  const d = Math.sqrt(dx * dx + dy * dy * 1.6);
  const r = lamp.radius * flick;
  if (d >= r) return 0;
  const t = 1 - d / r;
  return t * t * 0.85;
}

// Cold moon shaft: a slanted band of pale light from a high window.
function moonLight(x, y, shaft) {
  const slant = (y - shaft.topY) * shaft.angle;
  const cx = shaft.x + slant;
  const d = Math.abs(x - cx);
  if (d > shaft.width / 2 || y < shaft.topY) return 0;
  return (1 - d / (shaft.width / 2)) * 0.55;
}

// A guard flashlight cone: bright near the guard, fading with distance and
// falling off toward the cone's edges. cone = {x, y, angle, range, half}.
export function coneLight(x, y, cone) {
  const dx = x - cone.x, dy = y - cone.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > cone.range || dist < 4) return dist < 4 ? 0.9 : 0;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - cone.angle);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  if (diff > cone.half) return 0;
  const edge = 1 - diff / cone.half;
  const fall = 1 - dist / cone.range;
  return Math.min(1, edge * edge * (0.35 + 0.65 * fall) + 0.25 * fall);
}

// Combined light level at a point. cones: array of guard flashlight cones.
export function lightAt(x, y, cones, time) {
  let v = 0.05; // the hall is never perfectly black
  for (const lamp of LAMPS) v = Math.max(v, lampLight(x, y, lamp, time));
  for (const shaft of MOON_SHAFTS) v = Math.max(v, moonLight(x, y, shaft));
  for (const cone of cones) v = Math.max(v, coneLight(x, y, cone));
  return Math.min(1, v);
}

// Draw the darkness overlay: a near-black veil with holes cut where light falls.
// Called after the lit scene is drawn; uses 'destination-out' on an offscreen
// canvas so the light pools feel like real light cutting the dark.
export function drawDarkness(ctx, cones, time, w, h, lightCanvas) {
  const lc = lightCanvas.getContext('2d');
  lc.clearRect(0, 0, w, h);
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = 'rgba(4,4,10,0.86)';
  lc.fillRect(0, 0, w, h);
  lc.globalCompositeOperation = 'destination-out';
  // Lamp pools.
  for (const lamp of LAMPS) {
    const flick = 1 - lamp.flicker * 0.5 * Math.sin(time * 0.011 + lamp.x);
    const g = lc.createRadialGradient(lamp.x, lamp.y + 460, 10, lamp.x, lamp.y + 460, lamp.radius * flick);
    g.addColorStop(0, 'rgba(0,0,0,0.98)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.beginPath();
    lc.arc(lamp.x, lamp.y + 460, lamp.radius * flick, 0, Math.PI * 2);
    lc.fill();
  }
  // Moon shafts.
  for (const shaft of MOON_SHAFTS) {
    const grad = lc.createLinearGradient(shaft.x, 0, shaft.x + 400 * shaft.angle, h);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    lc.fillStyle = grad;
    lc.beginPath();
    lc.moveTo(shaft.x - shaft.width / 2, 0);
    lc.lineTo(shaft.x + shaft.width / 2, 0);
    lc.lineTo(shaft.x + shaft.width / 2 + h * shaft.angle, h);
    lc.lineTo(shaft.x - shaft.width / 2 + h * shaft.angle, h);
    lc.closePath();
    lc.fill();
  }
  // Flashlight cones — the brightest holes in the dark.
  for (const cone of cones) {
    const tipX = cone.x + Math.cos(cone.angle) * cone.range;
    const tipY = cone.y + Math.sin(cone.angle) * cone.range;
    const spread = Math.tan(cone.half) * cone.range;
    const px = -Math.sin(cone.angle) * spread, py = Math.cos(cone.angle) * spread;
    const g = lc.createRadialGradient(cone.x, cone.y, 8, cone.x, cone.y, cone.range);
    g.addColorStop(0, 'rgba(0,0,0,0.98)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.beginPath();
    lc.moveTo(cone.x, cone.y);
    lc.lineTo(tipX + px, tipY + py);
    lc.lineTo(tipX - px, tipY - py);
    lc.closePath();
    lc.fill();
  }
  ctx.drawImage(lightCanvas, 0, 0);
}
