// guard.js — museum guards with flashlight cones: patrol, pause, sweep,
// investigate noises, grow suspicious "?" then alert "!" and chase.
// The flashlight cone IS the vision cone.

import { sightBlocked } from './level.js';
import { lightAt, coneLight } from './lighting.js';

export function createGuard(post, index) {
  return {
    id: index,
    x: post.x, y: post.platformY,
    platformY: post.platformY,
    minX: post.minX, maxX: post.maxX,
    speed: post.speed,
    dir: index % 2 === 0 ? 1 : -1,
    state: 'patrol',           // patrol | pause | investigate | chase | search
    suspicion: 0,              // 0..100
    alarm: 0,                  // 0..100, shared urgency shown in HUD
    pauseTimer: 0,
    sweepPhase: index * 1.7,
    sweepDir: 1,
    targetX: null,             // noise / last-seen position
    stateTimer: 0,
    eyeX: 0, eyeY: 0,
    coneAngle: 0,
    coneRange: 260,
    coneHalf: 0.42,
    lastSeenX: null,
    lastSeenY: null,
  };
}

// The guard's flashlight cone this frame: sweeps while pausing, points at the
// player while suspicious, straight ahead while patrolling.
export function guardCone(g, time) {
  let angle;
  const sweep = Math.sin(time * 0.0011 + g.sweepPhase) * 0.55;
  if (g.state === 'chase' || g.state === 'investigate') {
    angle = Math.atan2((g.lastSeenY ?? g.y - 30) - (g.y - 34), (g.lastSeenX ?? g.x + g.dir * 100) - g.x);
  } else if (g.state === 'pause') {
    angle = (g.dir > 0 ? 0 : Math.PI) + sweep;
  } else {
    angle = (g.dir > 0 ? 0 : Math.PI) + sweep * 0.35;
  }
  g.coneAngle = angle;
  return { x: g.x, y: g.y - 34, angle, range: g.coneRange, half: g.coneHalf };
}

// Can this guard see the player right now? Needs the player inside the cone,
// lit enough, line of sight clear, and not fully hidden in deep shadow.
export function guardSees(g, player, cones, time) {
  const cone = guardCone(g, time);
  const eyeX = g.x, eyeY = g.y - 34;
  const dx = player.x - eyeX, dy = (player.y - player.h / 2) - eyeY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > cone.range + 40) return { seen: false, strength: 0 };
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - cone.angle);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  if (diff > cone.half + 0.12) return { seen: false, strength: 0 };
  if (sightBlocked(eyeX, eyeY, player.x, player.y - player.h / 2)) return { seen: false, strength: 0 };
  const lit = lightAt(player.x, player.y - player.h / 2, cones, time);
  // Deep shadow hides you even close; bright light exposes you fast.
  const exposure = lit * (player.crawling ? 0.55 : 1) * (player.sneaking ? 0.8 : 1);
  const closeness = 1 - dist / (cone.range + 40);
  const strength = exposure * (0.4 + 0.6 * closeness);
  return { seen: strength > 0.12, strength };
}

export function updateGuard(g, player, cones, time, dt) {
  const eye = guardSees(g, player, cones, time);
  const hearRange = 60 + player.noise * 260;
  const heard = player.noise > 0.35 && Math.abs(player.x - g.x) < hearRange
    && Math.abs(player.y - g.y) < 120;

  // Suspicion dynamics: seen in light raises it fast, shadow drains it.
  if (eye.seen) {
    g.suspicion = Math.min(100, g.suspicion + eye.strength * 2.6 * dt);
    g.lastSeenX = player.x;
    g.lastSeenY = player.y;
  } else if (heard) {
    g.suspicion = Math.min(100, g.suspicion + 0.9 * dt);
    g.targetX = player.x;
    if (g.state === 'patrol' || g.state === 'pause') g.state = 'investigate';
  } else {
    g.suspicion = Math.max(0, g.suspicion - (g.state === 'chase' ? 0.25 : 0.55) * dt);
  }

  // State machine.
  if (g.suspicion >= 100 && g.state !== 'chase') {
    g.state = 'chase';
    g.stateTimer = 0;
    g.alarm = Math.min(100, g.alarm + 30);
  } else if (g.suspicion >= 35 && g.state === 'patrol') {
    g.state = 'pause'; // "?" — stop, sweep the light toward the doubt
    g.pauseTimer = 90;
  }

  switch (g.state) {
    case 'patrol': {
      g.x += g.dir * g.speed * dt;
      if (g.x <= g.minX) { g.x = g.minX; g.dir = 1; g.state = 'pause'; g.pauseTimer = 70; }
      if (g.x >= g.maxX) { g.x = g.maxX; g.dir = -1; g.state = 'pause'; g.pauseTimer = 70; }
      break;
    }
    case 'pause': {
      g.pauseTimer -= dt;
      if (g.pauseTimer <= 0) {
        if (g.suspicion >= 35 && g.lastSeenX !== null) { g.state = 'investigate'; g.targetX = g.lastSeenX; }
        else { g.state = 'patrol'; g.lastSeenX = null; }
      }
      break;
    }
    case 'investigate': {
      if (g.targetX === null) { g.state = 'patrol'; break; }
      const d = g.targetX - g.x;
      g.dir = d > 0 ? 1 : -1;
      g.x += g.dir * g.speed * 1.5 * dt;
      if (Math.abs(d) < 8) {
        g.state = 'search';
        g.stateTimer = 150;
      }
      if (g.suspicion < 10) g.state = 'patrol';
      break;
    }
    case 'search': {
      g.stateTimer -= dt;
      if (g.stateTimer <= 0 || g.suspicion < 10) { g.state = 'patrol'; g.targetX = null; }
      break;
    }
    case 'chase': {
      const d = player.x - g.x;
      g.dir = d > 0 ? 1 : -1;
      g.x += g.dir * g.speed * 2.6 * dt;
      // Lost the thief in the dark: give up after suspicion drains.
      if (g.suspicion < 25) { g.state = 'search'; g.stateTimer = 120; }
      break;
    }
  }

  // Stay on the patrol beat.
  g.x = Math.max(g.minX - 40, Math.min(g.maxX + 40, g.x));
  g.alarm = Math.max(0, g.alarm - 0.08 * dt);
  return g;
}

// Caught: a chasing guard within arm's reach of the thief.
export function guardCatches(g, player) {
  return g.state === 'chase' && Math.abs(g.x - player.x) < 26 && Math.abs(g.y - player.y) < 60;
}
