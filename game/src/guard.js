// guard.js — the night guards: patrols, vision cones, suspicion, alarm.
// A guard walks a fixed route, pauses at waypoints to look around, and watches a
// cone in front of them. Seeing the player fills their suspicion meter; a full
// meter means the guard raises the alarm and gives chase. Breaking line of sight
// lets the meter cool — getting spotted is a scare, not an instant loss.

import { circleHitsSolid, inLight, inShadow, sightBlocked } from './level.js';

export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.56; // ~32 degrees each side
export const PATROL_SPEED = 66;
export const INVESTIGATE_SPEED = 112;
export const CHASE_SPEED = 158;
export const CATCH_DISTANCE = 26;

// Suspicion fills per second at point-blank range, scaled by distance, light and
// whether the player is sneaking. It drains when the player is unseen.
const FILL_BASE = 1.15;
const DRAIN_RATE = 0.38;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angleLerp(a, b, t) {
  return a + angleDiff(b, a) * t;
}

export class Guard {
  constructor(route, index) {
    this.index = index;
    this.route = route;
    this.x = route[0].x;
    this.y = route[0].y;
    this.radius = 14;
    this.targetIndex = 1 % route.length;
    this.angle = Math.atan2(
      route[this.targetIndex].y - this.y,
      route[this.targetIndex].x - this.x,
    );
    this.state = 'patrol'; // patrol | pause | suspicious | investigate | chase | search | return
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.lookTimer = 0;
    this.lookTarget = this.angle;
    this.lastSeen = null; // {x, y} where the player was last spotted
    this.noiseTarget = null;
    this.stateTimer = 0;
    this.chaseTime = 0;
    this.scanPhase = index * 1.7; // guards don't all sweep in sync
  }

  reset() {
    const fresh = new Guard(this.route, this.index);
    Object.assign(this, fresh);
  }

  // Can this guard see the player right now? Cone + range + line of sight.
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE || dist < 1) return { seen: false, dist };
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > CONE_HALF_ANGLE) {
      return { seen: false, dist };
    }
    if (sightBlocked(this.x, this.y, player.x, player.y)) return { seen: false, dist };
    return { seen: true, dist };
  }

  // How fast suspicion fills while the player is visible.
  fillRate(player, dist) {
    const closeness = 1 - dist / CONE_RANGE; // 0 far .. 1 point-blank
    let rate = FILL_BASE * (0.35 + closeness);
    if (player.sneaking) rate *= 0.45;
    if (inShadow(player.x, player.y)) rate *= 0.55;
    if (inLight(player.x, player.y)) rate *= 1.35;
    if (player.moving && !player.sneaking) rate *= 1.15;
    return rate;
  }

  hearNoise(noise) {
    if (this.state === 'chase') return;
    const dx = noise.x - this.x;
    const dy = noise.y - this.y;
    if (dx * dx + dy * dy < noise.radius * noise.radius) {
      this.noiseTarget = { x: noise.x, y: noise.y };
      if (this.state === 'patrol' || this.state === 'pause') {
        this.state = 'investigate';
        this.stateTimer = 0;
      }
    }
  }

  update(dt, player, onAlarm) {
    const { seen, dist } = this.canSee(player);

    // --- suspicion meter ---
    if (seen) {
      this.suspicion = Math.min(1, this.suspicion + this.fillRate(player, dist) * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else if (this.state !== 'chase') {
      this.suspicion = Math.max(0, this.suspicion - DRAIN_RATE * dt);
    }

    // A full meter trips the alarm and the chase.
    if (this.suspicion >= 1 && this.state !== 'chase') {
      this.state = 'chase';
      this.chaseTime = 0;
      if (onAlarm) onAlarm(this);
    }

    // --- behaviour by state ---
    switch (this.state) {
      case 'patrol':
        this.walkRoute(dt, PATROL_SPEED);
        if (this.suspicion > 0.35) this.state = 'suspicious';
        break;

      case 'pause': {
        this.pauseTimer -= dt;
        // Sweep the head left and right while standing at a waypoint.
        this.scanPhase += dt * 1.6;
        this.angle = this.lookTarget + Math.sin(this.scanPhase) * 0.85;
        if (this.pauseTimer <= 0) {
          this.state = 'patrol';
          this.angle = this.lookTarget;
        }
        if (this.suspicion > 0.35) this.state = 'suspicious';
        break;
      }

      case 'suspicious': {
        // Freeze, turn toward the glimpse, and stare. If it was nothing, cool off.
        if (this.lastSeen) {
          const want = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
          this.angle = angleLerp(this.angle, want, Math.min(1, dt * 6));
        }
        if (this.suspicion <= 0.05) this.state = 'patrol';
        else if (this.suspicion > 0.7) {
          this.state = 'investigate';
          this.stateTimer = 0;
        }
        break;
      }

      case 'investigate': {
        const target = this.lastSeen || this.noiseTarget;
        if (!target) {
          this.state = 'patrol';
          break;
        }
        this.stateTimer += dt;
        const arrived = this.walkToward(dt, target.x, target.y, INVESTIGATE_SPEED);
        if (arrived || this.stateTimer > 6) {
          this.state = 'search';
          this.stateTimer = 0;
          this.lookTarget = this.angle;
        }
        break;
      }

      case 'search': {
        // Look around the spot for a few seconds, then give up and head back.
        this.stateTimer += dt;
        this.scanPhase += dt * 2.2;
        this.angle = this.lookTarget + Math.sin(this.scanPhase) * 1.1;
        if (this.stateTimer > 3.2) {
          this.state = 'return';
          this.noiseTarget = null;
        }
        break;
      }

      case 'return': {
        // Walk back to the nearest waypoint, then resume the patrol.
        let best = 0;
        let bestDist = Infinity;
        this.route.forEach((wp, i) => {
          const d = (wp.x - this.x) ** 2 + (wp.y - this.y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        const arrived = this.walkToward(dt, this.route[best].x, this.route[best].y, PATROL_SPEED);
        if (arrived) {
          this.targetIndex = (best + 1) % this.route.length;
          this.state = 'patrol';
        }
        break;
      }

      case 'chase': {
        this.chaseTime += dt;
        // Out of sight, the guard's certainty fades: a chase that loses the
        // trail cools back into a search instead of running forever.
        if (!seen) this.suspicion = Math.max(0, this.suspicion - 0.3 * dt);
        // Chase the player's live position while seen, else the last seen spot.
        const target = seen ? { x: player.x, y: player.y } : this.lastSeen;
        if (target) this.walkToward(dt, target.x, target.y, CHASE_SPEED);
        // Lost them for good: search where they vanished, then stand down.
        if (!seen && this.suspicion < 0.55) {
          this.state = 'search';
          this.stateTimer = 0;
          this.lookTarget = this.angle;
        }
        if (this.chaseTime > 9) {
          this.suspicion = 0.4;
          this.state = 'search';
          this.stateTimer = 0;
          this.lookTarget = this.angle;
        }
        break;
      }
      default:
        this.state = 'patrol';
    }
  }

  // Walk toward the current patrol waypoint; pause and look around on arrival.
  walkRoute(dt, speed) {
    const wp = this.route[this.targetIndex];
    const arrived = this.walkToward(dt, wp.x, wp.y, speed);
    if (arrived) {
      this.targetIndex = (this.targetIndex + 1) % this.route.length;
      this.state = 'pause';
      this.pauseTimer = 1.4;
      // Face the next leg of the route while pausing.
      const next = this.route[this.targetIndex];
      this.lookTarget = Math.atan2(next.y - this.y, next.x - this.x);
    }
  }

  // Step toward (tx, ty) at speed, turning to face the movement. Returns true on arrival.
  walkToward(dt, tx, ty, speed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, speed * dt);
    const nx = (dx / dist) * step;
    const ny = (dy / dist) * step;
    const want = Math.atan2(dy, dx);
    this.angle = angleLerp(this.angle, want, Math.min(1, dt * 8));
    // Slide along walls the same way the player does, one axis at a time.
    const canX = !circleHitsSolid(this.x + nx, this.y, this.radius);
    const canY = !circleHitsSolid(this.x, this.y + ny, this.radius);
    if (canX) this.x += nx;
    if (canY) this.y += ny;
    // Pressed against cover, sidestep around it instead of pushing into it
    // forever: try sideways, first one way, then the other.
    if ((!canX || !canY) && (nx !== 0 || ny !== 0)) {
      const px = -ny;
      const py = nx;
      if (!circleHitsSolid(this.x + px, this.y + py, this.radius)) {
        this.x += px;
        this.y += py;
      } else if (!circleHitsSolid(this.x - px, this.y - py, this.radius)) {
        this.x -= px;
        this.y -= py;
      }
    }
    return dist - step < 6;
  }

  caughtPlayer(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    return dx * dx + dy * dy < CATCH_DISTANCE * CATCH_DISTANCE;
  }
}
