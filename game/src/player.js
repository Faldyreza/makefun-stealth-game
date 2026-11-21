// player.js — the thief: movement, sneaking, noise, relic pickup.
// Walk is fast but loud and easy to spot; sneak (Shift) is slow, quiet and
// much harder to spot. Click-to-move walks the thief to a floor point.

import { solidRects } from './levels.js';
import { circleHitsRect, resolveCircle } from './lighting.js';

export const WALK_SPEED = 175;
export const SNEAK_SPEED = 98;
export const PLAYER_RADIUS = 13;

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.dir = -Math.PI / 2; // facing up at spawn
    this.sneaking = false;
    this.moving = false;
    this.noise = 0;           // noise radius this frame (0 while sneaking)
    this.walkPhase = 0;       // walk-cycle phase for the sprite animation
    this.moveTarget = null;   // {x, y} for click-to-move, or null
    this.stepTimer = 0;       // counts down to the next footstep tick
  }

  reset(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.dir = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.noise = 0;
    this.walkPhase = 0;
    this.moveTarget = null;
    this.stepTimer = 0;
  }

  /** Keyboard vector, or a step toward the click target. */
  update(dt, input, level) {
    const solids = solidRects(level);
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;

    if (mx === 0 && my === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        this.moveTarget = null;
      } else {
        mx = dx / d;
        my = dy / d;
      }
    }

    this.sneaking = !!input.sneak;
    const len = Math.hypot(mx, my);
    this.moving = len > 0.01;
    if (this.moving) {
      const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
      mx /= len; my /= len;
      this.dir = Math.atan2(my, mx);
      // Move axis by axis so the thief slides along walls instead of sticking.
      let nx = this.x + mx * speed * dt;
      let hit = false;
      for (const r of solids) if (circleHitsRect(nx, this.y, PLAYER_RADIUS, r)) { hit = true; break; }
      if (!hit) this.x = nx;
      let ny = this.y + my * speed * dt;
      hit = false;
      for (const r of solids) if (circleHitsRect(this.x, ny, PLAYER_RADIUS, r)) { hit = true; break; }
      if (!hit) this.y = ny;
      const fixed = resolveCircle(this.x, this.y, PLAYER_RADIUS, solids);
      this.x = fixed.x; this.y = fixed.y;
      this.walkPhase += dt * (this.sneaking ? 7 : 11);
      this.noise = this.sneaking ? 0 : 70;
      this.stepTimer -= dt;
    } else {
      this.noise = 0;
    }
  }

  /** True once per footstep while moving (drives the footstep sound). */
  stepped() {
    if (!this.moving || this.stepTimer > 0) return false;
    this.stepTimer = this.sneaking ? 0.55 : 0.34;
    return true;
  }

  /** Collect any relic within reach; returns the relic taken, or null. */
  tryPickup(level) {
    for (const relic of level.relics) {
      if (!relic.taken && Math.hypot(relic.x - this.x, relic.y - this.y) < 30) {
        relic.taken = true;
        return relic;
      }
    }
    return null;
  }

  /** Touch the fuse box to cut the cameras; returns true when it happens. */
  tryFuse(level) {
    const f = level.fuse;
    if (f && !f.used && Math.hypot(f.x - this.x, f.y - this.y) < 34) {
      f.used = true;
      return true;
    }
    return false;
  }

  /** True when the thief stands on the exit and it is unlocked. */
  atExit(level, unlocked) {
    if (!unlocked) return false;
    const e = level.exit;
    return this.x > e.x - 6 && this.x < e.x + e.w + 6 &&
           this.y > e.y - 6 && this.y < e.y + e.h + 6;
  }
}
