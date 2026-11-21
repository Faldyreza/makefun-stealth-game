// guard.js — the night staff. Three kinds, one suspicion system.
// Patroller: walks a waypoint loop, pauses at each stop and looks around.
// Sentry: stands in one spot and sweeps its long narrow cone back and forth.
// Roamer: wanders a long cross-map route with no fixed rhythm.
// Every guard has a suspicion meter: unaware -> suspicious (walks over to
// look, "?" overhead) -> alert (chases, "!" overhead). Breaking line of
// sight and hiding in shadow lets the meter cool back down.

export const SUSPICIOUS_AT = 0.45;
export const ALERT_AT = 0.85;

// Per-kind tuning: cone length, cone half-angle, walk speed, chase speed,
// and how sharply the guard notices the player.
const KIND_TUNING = {
  patroller: { coneLen: 235, halfAngle: 0.52, patrol: 72, chase: 152, sense: 1.0 },
  sentry: { coneLen: 305, halfAngle: 0.30, patrol: 0, chase: 138, sense: 1.25 },
  roamer: { coneLen: 215, halfAngle: 0.52, patrol: 96, chase: 158, sense: 0.9 },
};

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createGuard(def) {
  const t = KIND_TUNING[def.kind];
  return {
    name: def.name,
    kind: def.kind,
    x: def.x,
    y: def.y,
    angle: def.angle,
    baseAngle: def.angle,
    homeX: def.x,
    homeY: def.y,
    coneLen: t.coneLen,
    halfAngle: t.halfAngle,
    patrolSpeed: t.patrol,
    chaseSpeed: t.chase,
    sense: t.sense,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    pauseLeft: 0,
    lookPhase: Math.random() * Math.PI * 2,
    sweepDir: 1,
    mode: 'patrol', // patrol | investigate | chase
    suspicion: 0,
    lastSeen: null,
    lastSeenAt: -99,
    lostSightFor: 0,
    investigateLeft: 0,
    // True this frame when the guard can currently see the player.
    seesPlayer: false,
    stuckFor: 0,
    lastX: def.x,
    lastY: def.y,
  };
}

// Can this guard see the player right now? Inside the cone, in range, and
// with a clear line of sight (no wall or tall shelf between them).
export function guardCanSee(guard, level, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.coneLen) return false;
  if (dist < 14) return level.hasLineOfSight(guard.x, guard.y, px, py);
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, guard.angle)) > guard.halfAngle) return false;
  return level.hasLineOfSight(guard.x, guard.y, px, py);
}

// How fast suspicion rises while the guard sees the player. Nearer, in
// lamplight, and moving fast all fill the meter quicker; far away, in
// shadow, and sneaking fill it far slower.
export function suspicionRate(guard, level, player, dist) {
  const near = 1.15 - Math.min(1, dist / guard.coneLen);
  const light = level.lightFactorAt(player.x, player.y);
  const vis = player.moving ? (player.sneaking ? 0.45 : 1.0) : 0.55;
  return 1.1 * Math.max(0.25, near) * light * vis * guard.sense;
}

// Walk toward a point, sliding along walls. Returns true when arrived.
function walkToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  level.resolveCircle(guard, 13);
  guard.y += (dy / dist) * step;
  level.resolveCircle(guard, 13);
  guard.angle = Math.atan2(dy, dx);
  return dist - step < 6;
}

export function updateGuard(guard, level, player, now, dt, onAlert) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const sees = guardCanSee(guard, level, player.x, player.y);
  guard.seesPlayer = sees;

  if (sees) {
    guard.suspicion += suspicionRate(guard, level, player, dist) * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.lastSeenAt = now;
    guard.lostSightFor = 0;
    if (guard.suspicion >= ALERT_AT && guard.mode !== 'chase') {
      guard.mode = 'chase';
      if (onAlert) onAlert(guard);
    } else if (guard.suspicion >= SUSPICIOUS_AT && guard.mode === 'patrol') {
      guard.mode = 'investigate';
      guard.investigateLeft = 0;
    }
  } else {
    guard.lostSightFor += dt;
    // The meter cools when the player is out of sight — faster in shadow.
    // A guard already walking over to investigate keeps its hunch while it
    // moves, and only cools off once it has searched the spot.
    const cool = guard.mode === 'investigate' ? 0.08
      : level.inShadow(player.x, player.y) ? 0.55 : 0.4;
    guard.suspicion = Math.max(0, guard.suspicion - cool * dt);
    if (guard.mode === 'chase' && guard.lostSightFor > 2.5) {
      guard.mode = 'investigate';
      guard.investigateLeft = 0;
    }
    if (guard.mode === 'investigate' && guard.suspicion < SUSPICIOUS_AT) {
      guard.mode = 'patrol';
    }
  }
  guard.suspicion = Math.min(1, guard.suspicion);

  // ---- behaviour by mode ----------------------------------------------
  if (guard.mode === 'chase') {
    const target = guard.lastSeen || { x: player.x, y: player.y };
    walkToward(guard, level, target.x, target.y, guard.chaseSpeed, dt);
    guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
  } else if (guard.mode === 'investigate') {
    if (guard.lastSeen) {
      // Sentries walk too: they have no patrol speed, so give every kind
      // a floor of 70 px/s while investigating.
      const invSpeed = Math.max(guard.patrolSpeed, 70) * 1.25;
      const arrived = walkToward(guard, level, guard.lastSeen.x, guard.lastSeen.y, invSpeed, dt);
      if (arrived) {
        guard.investigateLeft += dt;
        // Look around while searching the spot.
        guard.angle += Math.sin(now * 2.2 + guard.lookPhase) * 1.6 * dt;
        if (guard.investigateLeft > 2.5) {
          guard.mode = 'patrol';
          guard.suspicion = Math.min(guard.suspicion, 0.3);
        }
      }
    } else {
      guard.mode = 'patrol';
    }
  } else if (guard.kind === 'sentry') {
    // A sentry that walked off to investigate first strolls back to its
    // post; once home it sweeps its long narrow cone back and forth.
    const homeDist = Math.hypot(guard.homeX - guard.x, guard.homeY - guard.y);
    if (homeDist > 8) {
      walkToward(guard, level, guard.homeX, guard.homeY, 80, dt);
    } else {
      guard.sweepDir = guard.angle > guard.baseAngle + 1.05 ? -1
        : guard.angle < guard.baseAngle - 1.05 ? 1 : guard.sweepDir;
      guard.angle += guard.sweepDir * 0.55 * dt;
    }
  } else {
    // Patroller / roamer: follow the waypoint loop, pausing to look around.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.angle += Math.sin(now * 1.8 + guard.lookPhase) * 1.4 * dt;
    } else {
      const wp = guard.waypoints[guard.waypointIndex];
      const arrived = walkToward(guard, level, wp.x, wp.y, guard.patrolSpeed, dt);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.kind === 'roamer' ? 0.5 : 1.3;
      }
    }
  }

  // If a walking guard has barely moved for a while, skip to the next
  // waypoint instead of grinding against a wall forever.
  const moved = Math.hypot(guard.x - guard.lastX, guard.y - guard.lastY);
  if (guard.mode === 'patrol' && guard.kind !== 'sentry' && guard.pauseLeft <= 0) {
    if (moved < 0.05) {
      guard.stuckFor += dt;
      if (guard.stuckFor > 1.2) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.stuckFor = 0;
      }
    } else {
      guard.stuckFor = 0;
    }
  }
  guard.lastX = guard.x;
  guard.lastY = guard.y;
}

// The guard's current state, for the renderer and the HUD.
export function guardStage(guard) {
  if (guard.mode === 'chase') return 'alert';
  if (guard.suspicion >= SUSPICIOUS_AT || guard.mode === 'investigate') return 'suspicious';
  return 'unaware';
}
