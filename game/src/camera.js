// camera.js — wall-mounted security cameras (levels 2 and 3).
// A camera sweeps its cone back and forth. While the thief stands in the
// cone with a clear line of sight, the camera's lock builds; a full lock
// raises the alarm and radios the nearest guard. Touching the level's fuse
// box cuts every camera on the floor.

import { lineOfSightClear } from './lighting.js';
import { sightBlockers } from './levels.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export class SecurityCamera {
  constructor(cfg) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.baseAngle = cfg.baseAngle;
    this.sweep = cfg.sweep;      // radians either side of baseAngle
    this.range = cfg.range;
    this.speed = cfg.speed;
    this.half = 0.42;            // cone half-angle (~24 deg)
    this.phase = Math.random() * 6.28;
    this.angle = cfg.baseAngle;
    this.lock = 0;               // 0..1 — full lock trips the alarm
    this.seeing = false;
    this.disabled = false;
    this.tripped = false;        // true for one frame when the lock completes
  }

  disable() {
    this.disabled = true;
    this.lock = 0;
    this.seeing = false;
  }

  update(dt, player, level) {
    this.tripped = false;
    if (this.disabled) return;
    this.phase += dt * this.speed;
    this.angle = this.baseAngle + Math.sin(this.phase) * this.sweep;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.seeing = false;
    if (dist < this.range &&
        Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) < this.half &&
        lineOfSightClear(this.x, this.y, player.x, player.y, sightBlockers(level))) {
      this.seeing = true;
      // Cameras spot faster in lamplight, slower in shadow — same rule as guards.
      let rate = 0.85;
      if (dist < 90) rate *= 1.5;
      this.lock = Math.min(1, this.lock + rate * dt);
      if (this.lock >= 1) {
        this.tripped = true;
        this.lock = 0.55; // hold the alarm for a beat, then keep watching
      }
    } else {
      this.lock = Math.max(0, this.lock - 0.5 * dt);
    }
  }
}
