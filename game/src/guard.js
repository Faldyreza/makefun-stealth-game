// guard.js — the museum guards: patrol, vision cone, suspicion, chase.
// One job: decide what each guard does and how close they are to spotting
// the thief. No rendering here — render.js draws the cone this file defines.

import { tileDist, tileAngle } from './iso.js';
import { lineBlocked, coverAt } from './level.js';

export const CONE_RANGE = 4.4; // tiles: how far a guard can see
export const CONE_HALF_ANGLE = 0.62; // radians (~35 deg each side)
export const PATROL_SPEED = 1.5;
export const CHASE_SPEED = 2.9;
export const SEARCH_SPEED = 1.9;
export const CATCH_DISTANCE = 0.55; // tiles: a chasing guard touching you

export function createGuard(route, index) {
  const start = route.waypoints[0];
  return {
    name: route.name,
    x: start[0],
    y: start[1],
    facing: 0,
    waypoints: route.waypoints,
    wpIndex: 1,
    pauseTimer: 0,
    state: 'patrol', // patrol | suspicious | chase | search
    suspicion: 0, // 0..1 ; "?" past 0.35, "!" past 0.85 (chase)
    lastSeen: null, // {x, y} where the thief was last spotted
    searchTimer: 0,
    scanPhase: index * 1.7, // guards sweep out of phase with each other
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard see the thief right now? Cone + range + line of sight.
export function canSeeGuard(g, player) {
  const d = tileDist(g.x, g.y, player.x, player.y);
  if (d > CONE_RANGE) return { seen: false, dist: d };
  const ang = tileAngle(g.x, g.y, player.x, player.y);
  if (Math.abs(angleDiff(ang, g.facing)) > CONE_HALF_ANGLE) return { seen: false, dist: d };
  if (lineBlocked(g.x, g.y, player.x, player.y)) return { seen: false, dist: d };
  return { seen: true, dist: d };
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + (dx / d) * step;
  const ny = g.y + (dy / d) * step;
  // Guards walk around cover, never through it.
  if (!coverAt(nx, ny)) {
    g.x = nx;
    g.y = ny;
  } else if (!coverAt(nx, g.y)) {
    g.x = nx;
  } else if (!coverAt(g.x, ny)) {
    g.y = ny;
  }
  g.facing = tileAngle(g.x, g.y, tx, ty);
  return d <= 0.08;
}

// One guard, one frame. Returns 'caught' when the guard touches the thief.
export function updateGuard(g, player, dt, time) {
  const sight = canSeeGuard(g, player);
  if (sight.seen) {
    // Suspicion fills faster up close, faster still when the thief runs,
    // slower when sneaking, and half as fast from the balcony above.
    let rate = 0.85 * (1.25 - sight.dist / CONE_RANGE);
    if (!player.sneaking && player.moving) rate *= 1.6;
    if (player.sneaking) rate *= 0.55;
    if (player.onBalcony) rate *= 0.5;
    g.suspicion = Math.min(1, g.suspicion + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
  } else {
    g.suspicion = Math.max(0, g.suspicion - 0.28 * dt);
  }

  if (g.suspicion >= 0.85) g.state = 'chase';
  else if (g.suspicion >= 0.35) g.state = 'suspicious';
  else if (g.state !== 'search') g.state = 'patrol';

  if (g.state === 'chase') {
    const target = g.lastSeen || { x: player.x, y: player.y };
    moveToward(g, target.x, target.y, CHASE_SPEED, dt);
    if (tileDist(g.x, g.y, player.x, player.y) < CATCH_DISTANCE) return 'caught';
    if (!sight.seen && g.suspicion < 0.4) {
      g.state = 'search';
      g.searchTimer = 4;
    }
  } else if (g.state === 'search' && g.lastSeen) {
    const arrived = moveToward(g, g.lastSeen.x, g.lastSeen.y, SEARCH_SPEED, dt);
    if (arrived) {
      // Look around for a while, sweeping the cone around the spot where
      // the thief was last seen, then give up and go back to patrol.
      g.searchTimer -= dt;
      const base = tileAngle(g.x, g.y, g.lastSeen.x, g.lastSeen.y);
      g.facing = base + Math.sin(time * 1.4 + g.scanPhase) * 1.1;
      if (g.searchTimer <= 0) {
        g.state = 'patrol';
        g.lastSeen = null;
        g.suspicion = 0;
      }
    }
  } else if (g.state === 'suspicious') {
    // Stop, stare at the doubt, sweep the cone slowly.
    g.facing += Math.sin(time * 1.1 + g.scanPhase) * 0.35 * dt;
  } else {
    // Patrol: walk the route, pausing at each waypoint to look around.
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
      g.facing += Math.sin(time * 0.9 + g.scanPhase) * 0.5 * dt;
    } else {
      const wp = g.waypoints[g.wpIndex];
      const arrived = moveToward(g, wp[0], wp[1], PATROL_SPEED, dt);
      if (arrived) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.pauseTimer = 1.2;
      }
    }
  }
  return null;
}

// The cone's screen-space direction, for render.js.
export function coneDirection(g) {
  return g.facing;
}
