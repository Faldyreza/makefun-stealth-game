// lighting.js — raycast vision cones, line of sight, shadow and lamp light.
// A cone is a fan of ~30 rays; each ray stops at the first wall or tall cover
// it hits, so cones are visibly clipped by cover instead of painting over it.

/** Ray (ox,oy) + t*(dx,dy) vs axis-aligned rect; returns nearest hit t or null. */
export function rayRect(ox, oy, dx, dy, r) {
  let tMin = 0;
  let tMax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return null;
  } else {
    let t1 = (r.x - ox) / dx;
    let t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return null;
  } else {
    let t1 = (r.y - oy) / dy;
    let t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

/** Distance along a ray to the nearest blocker, capped at maxDist. */
export function rayHitDistance(ox, oy, angle, maxDist, blockers) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const r of blockers) {
    const t = rayRect(ox, oy, dx, dy, r);
    if (t !== null && t > 0 && t < best) best = t;
  }
  return best;
}

/**
 * Cast a vision cone: returns the polygon (array of {x,y}) of the visible
 * area from (ox,oy) facing `angle`, half-angle `half`, out to `range`.
 * 31 rays; each ray stops at walls / tall cover.
 */
export function castCone(ox, oy, angle, half, range, blockers, rays = 31) {
  const pts = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - half + (2 * half * i) / rays;
    const d = rayHitDistance(ox, oy, a, range, blockers);
    pts.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d });
  }
  return pts;
}

/** True when the segment (x1,y1)-(x2,y2) touches no sight blocker. */
export function lineOfSightClear(x1, y1, x2, y2, blockers) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const ux = dx / dist;
  const uy = dy / dist;
  for (const r of blockers) {
    const t = rayRect(x1, y1, ux, uy, r);
    if (t !== null && t > 0.5 && t < dist - 0.5) return false;
  }
  return true;
}

/** True when a point sits inside a shadow patch (detection is slower there). */
export function inShadow(x, y, shadows) {
  for (const s of shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

/** True when a point sits inside a lamp pool (detection is faster there). */
export function inLampLight(x, y, lamps) {
  for (const l of lamps) {
    if (Math.hypot(x - l.x, y - l.y) < l.r) return true;
  }
  return false;
}

/**
 * Detection multiplier at a point: shadow 0.45x, lamp light 1.6x, else 1x.
 * Shadow wins over lamp light when they overlap.
 */
export function lightFactor(x, y, level) {
  if (inShadow(x, y, level.shadows)) return 0.45;
  if (inLampLight(x, y, level.lamps)) return 1.6;
  return 1;
}

/** Circle (cx,cy,r) vs rect overlap test, for movement collision. */
export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/**
 * Push a circle out of every solid rect it overlaps. Returns true if any push
 * happened. Called after moving, so entities slide along walls.
 */
export function resolveCircle(cx, cy, r, rects) {
  let pushed = false;
  for (const rect of rects) {
    const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    let dx = cx - nx;
    let dy = cy - ny;
    let d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    pushed = true;
    if (d2 < 1e-6) {
      // Centre inside the rect: push out along the smallest penetration axis.
      const left = cx - rect.x;
      const right = rect.x + rect.w - cx;
      const top = cy - rect.y;
      const bottom = rect.y + rect.h - cy;
      const m = Math.min(left, right, top, bottom);
      if (m === left) cx = rect.x - r;
      else if (m === right) cx = rect.x + rect.w + r;
      else if (m === top) cy = rect.y - r;
      else cy = rect.y + rect.h + r;
    } else {
      const d = Math.sqrt(d2);
      dx /= d; dy /= d;
      cx = nx + dx * r;
      cy = ny + dy * r;
    }
  }
  return { x: cx, y: cy, pushed };
}
