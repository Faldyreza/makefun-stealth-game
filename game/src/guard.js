// guard.js — night guards: patrols, vision cones, suspicion, alert.
// Detection has three stages: unaware -> suspicious ("?", walks over to look)
// -> alert ("!", chases). A guard that goes fully alert radios the others,
// so nearby guards converge on the last-seen position. Lose them, and they
// search the area in a pattern before giving up and returning to patrol.

import { lineOfSightClear, lightFactor, circleHitsRect, resolveCircle } from './lighting.js';
import { solidRects, sightBlockers } from './levels.js';

const KIND_STATS = {
  patroller: { speed: 72, range: 250, half: 0.62, chase: 118 },
  sentry:    { speed: 0,  range: 305, half: 0.50, chase: 105 },
  roamer:    { speed: 62, range: 240, half: 0.62, chase: 110 },
  elite:     { speed: 118, range: 320, half: 0.60, chase: 172 },
};

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export class Guard {
  constructor(cfg) {
    const stats = KIND_STATS[cfg.kind] || KIND_STATS.patroller;
    this.kind = cfg.kind;
    this.x = cfg.x;
    this.y = cfg.y;
    this.waypoints = cfg.waypoints.map(([x, y]) => ({ x, y }));
    this.wpIndex = 1 % this.waypoints.length;
    this.speed = stats.speed;
    this.chaseSpeed = stats.chase;
    this.range = stats.range;
    this.half = stats.half;
    this.radius = 14;
    this.dir = Math.PI / 2;
    this.state = 'patrol';      // patrol | suspicious | alert | search | return
    this.suspicion = 0;         // 0..1; 0.5 = suspicious, 1 = alert
    this.seeing = false;
    this.lastSeen = null;       // {x, y} where the player was last spotted
    this.pauseTimer = 0;
    this.lookTimer = 0;
    this.loseTimer = 0;
    this.sweepPhase = Math.random() * 6.28;
    this.searchPoints = [];
    this.searchIndex = 0;
    this.walkPhase = 0;
    this.flash = 0;             // hit-flash timer for the "!" pop
  }

  /** Move toward a point, sliding along walls; sidesteps when blocked. */
  walkToward(tx, ty, speed, dt, solids) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const ux = dx / d;
    const uy = dy / d;
    this.dir = Math.atan2(uy, ux);
    const step = speed * dt;
    let nx = this.x + ux * step;
    let ny = this.y + uy * step;
    let blocked = false;
    for (const r of solids) if (circleHitsRect(nx, ny, this.radius, r)) { blocked = true; break; }
    if (blocked) {
      // Try sliding along one axis, then a perpendicular sidestep.
      let ax = this.x + ux * step;
      let ok = true;
      for (const r of solids) if (circleHitsRect(ax, this.y, this.radius, r)) { ok = false; break; }
      if (ok) { nx = ax; ny = this.y; }
      else {
        let ay = this.y + uy * step;
        ok = true;
        for (const r of solids) if (circleHitsRect(this.x, ay, this.radius, r)) { ok = false; break; }
        if (ok) { nx = this.x; ny = ay; }
        else {
          const px = -uy; const py = ux;
          const sx = this.x + px * step;
          const sy = this.y + py * step;
          ok = true;
          for (const r of solids) if (circleHitsRect(sx, sy, this.radius, r)) { ok = false; break; }
          if (ok) { nx = sx; ny = sy; }
          else { nx = this.x; ny = this.y; }
        }
      }
    }
    const moved = Math.hypot(nx - this.x, ny - this.y) > 0.01;
    this.x = nx; this.y = ny;
    const fixed = resolveCircle(this.x, this.y, this.radius, solids);
    this.x = fixed.x; this.y = fixed.y;
    if (moved) this.walkPhase += dt * 9;
    return d < 10;
  }

  /** Can this guard see the player right now? (cone + line of sight) */
  seesPlayer(player, level) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.range) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.dir)) > this.half) return false;
    return lineOfSightClear(this.x, this.y, player.x, player.y, sightBlockers(level));
  }

  update(dt, player, level, events) {
    const solids = solidRects(level);
    this.flash = Math.max(0, this.flash - dt);

    // Bumping into a guard is being caught, whatever the guard was doing.
    if (Math.hypot(player.x - this.x, player.y - this.y) < 24) {
      if (events.onCaught) events.onCaught(this);
      return;
    }

    // --- sensing -----------------------------------------------------------
    this.seeing = this.seesPlayer(player, level);
    if (this.seeing) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      let rate = 1.15;
      if (dist < 80) rate *= 1.6;
      else if (dist > this.range * 0.75) rate *= 0.55;
      rate *= lightFactor(player.x, player.y, level);
      if (player.sneaking) rate *= 0.45;
      if (!player.moving) rate *= 0.8;
      this.suspicion = Math.min(1, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
    } else {
      // Footsteps carry: a walking thief nearby draws a look.
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (player.noise > 0 && dist < player.noise + 30 && this.state === 'patrol') {
        this.suspicion = Math.min(1, this.suspicion + 0.22 * dt);
        this.lastSeen = { x: player.x, y: player.y };
      }
      const drain = this.state === 'suspicious' ? 0.10 : 0.28;
      this.suspicion = Math.max(0, this.suspicion - drain * dt);
    }

    // --- stage transitions --------------------------------------------------
    if (this.suspicion >= 1 && this.state !== 'alert') {
      this.state = 'alert';
      this.flash = 0.6;
      if (events.onAlert) events.onAlert(this);
    } else if (this.suspicion >= 0.5 && this.state === 'patrol') {
      this.state = 'suspicious';
      if (events.onSuspicion) events.onSuspicion(this);
    }

    // --- behaviour ----------------------------------------------------------
    if (this.state === 'alert') {
      if (this.seeing) {
        this.loseTimer = 0;
      } else {
        this.loseTimer += dt;
        if (this.loseTimer > 3) {
          // Lost the thief: search the last-seen area, then give up.
          this.state = 'search';
          const lx = this.lastSeen ? this.lastSeen.x : this.x;
          const ly = this.lastSeen ? this.lastSeen.y : this.y;
          this.searchPoints = [
            { x: lx - 70, y: ly - 50 }, { x: lx + 70, y: ly - 40 },
            { x: lx, y: ly + 70 }, { x: lx, y: ly },
          ];
          this.searchIndex = 0;
          this.suspicion = 0.7;
        }
      }
      const target = this.lastSeen || { x: player.x, y: player.y };
      this.walkToward(target.x, target.y, this.chaseSpeed, dt, solids);
      if (Math.hypot(player.x - this.x, player.y - this.y) < 26) {
        if (events.onCaught) events.onCaught(this);
      }
      return;
    }

    if (this.state === 'suspicious') {
      if (this.lastSeen) {
        const arrived = this.walkToward(this.lastSeen.x, this.lastSeen.y,
          Math.max(this.speed, 85), dt, solids);
        if (arrived) {
          this.lookTimer += dt;
          this.dir += dt * 1.6; // look around the spot
          if (this.lookTimer > 1.4) {
            this.lookTimer = 0;
            if (this.suspicion < 0.5) this.state = 'patrol';
            else if (!this.seeing) this.suspicion = Math.max(0, this.suspicion - 0.2);
          }
        }
      }
      if (this.suspicion <= 0.05) this.state = 'patrol';
      return;
    }

    if (this.state === 'search') {
      const pt = this.searchPoints[this.searchIndex];
      if (!pt) { this.state = 'return'; return; }
      const arrived = this.walkToward(pt.x, pt.y, Math.max(this.speed, 80), dt, solids);
      if (arrived) {
        this.lookTimer += dt;
        this.dir += dt * 2.2;
        if (this.lookTimer > 0.9) {
          this.lookTimer = 0;
          this.searchIndex++;
          if (this.searchIndex >= this.searchPoints.length) {
            this.state = 'return';
            this.suspicion = 0.3;
          }
        }
      }
      return;
    }

    if (this.state === 'return') {
      // Walk back to the nearest patrol waypoint, then resume the round.
      let best = 0;
      let bestD = Infinity;
      this.waypoints.forEach((w, i) => {
        const d = Math.hypot(w.x - this.x, w.y - this.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const arrived = this.walkToward(this.waypoints[best].x, this.waypoints[best].y,
        Math.max(this.speed, 80), dt, solids);
      if (arrived) {
        this.wpIndex = (best + 1) % this.waypoints.length;
        this.state = 'patrol';
        this.suspicion = 0;
      }
      return;
    }

    // --- patrol --------------------------------------------------------------
    if (this.kind === 'sentry') {
      // A sentry holds its post and sweeps its cone back and forth.
      this.sweepPhase += dt * 0.55;
      this.dir = Math.PI / 2 + Math.sin(this.sweepPhase) * 1.05;
      return;
    }
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.dir += dt * 0.9; // glance around while paused
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    const arrived = this.walkToward(wp.x, wp.y, this.speed, dt, solids);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = this.kind === 'roamer' ? 0.4 : 0.9;
      if (this.kind === 'roamer') {
        // Roamers pick their next stop at random instead of in order.
        this.wpIndex = Math.floor(Math.random() * this.waypoints.length);
      }
    }
  }
}
