// player.js — the hooded thief: movement, sneaking, noise, key pickup.
// The player is a circle that slides along walls; noise is what guards hear.

import { circleHitsSolid, EXIT, KEY_SPOTS, LEVEL_HEIGHT, LEVEL_WIDTH, WALL } from './level.js';

export const WALK_SPEED = 175;
export const SNEAK_SPEED = 92;
export const PLAYER_RADIUS = 13;

// Noise a guard can hear: walking is loud, sneaking is a whisper.
export const WALK_NOISE_RADIUS = 85;
export const SNEAK_NOISE_RADIUS = 26;
export const STEP_INTERVAL_WALK = 0.42;
export const STEP_INTERVAL_SNEAK = 0.68;

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 96;
    this.y = 640;
    this.radius = PLAYER_RADIUS;
    this.facing = -Math.PI / 2; // starts looking up the floor
    this.sneaking = false;
    this.moving = false;
    this.keys = 0;
    this.stepTimer = 0;
    this.bob = 0; // walk-cycle phase, drives the cloak sway in render.js
    this.noiseEvents = []; // {x, y, radius} emitted this frame for guards to hear
  }

  // dirX/dirY come from input.js, already normalised. dt in seconds.
  update(dt, input, onStep) {
    this.noiseEvents.length = 0;
    const ix = input.axisX();
    const iy = input.axisY();
    const len = Math.hypot(ix, iy);
    this.moving = len > 0.01;
    this.sneaking = input.sneak() && this.moving;

    if (this.moving) {
      const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
      const nx = ix / len;
      const ny = iy / len;
      this.facing = Math.atan2(ny, nx);
      this.bob += dt * (this.sneaking ? 7 : 11);
      this.moveAxis(nx * speed * dt, 0);
      this.moveAxis(0, ny * speed * dt);

      // Footsteps: a soft tick plus a noise pulse guards can investigate.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? STEP_INTERVAL_SNEAK : STEP_INTERVAL_WALK;
        const radius = this.sneaking ? SNEAK_NOISE_RADIUS : WALK_NOISE_RADIUS;
        this.noiseEvents.push({ x: this.x, y: this.y, radius });
        if (onStep) onStep(this.sneaking, this.x, this.y);
      }
    } else {
      this.stepTimer = 0;
    }
  }

  // Move one axis at a time so the player slides along walls instead of sticking.
  moveAxis(dx, dy) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!circleHitsSolid(nx, ny, this.radius)) {
      this.x = Math.max(WALL + this.radius, Math.min(LEVEL_WIDTH - WALL - this.radius, nx));
      this.y = Math.max(WALL + this.radius, Math.min(LEVEL_HEIGHT - WALL - this.radius, ny));
    }
  }

  // Standing on a document spot picks it up. Returns the label or null.
  tryCollect(keys) {
    for (const k of keys) {
      if (!k.taken) {
        const dx = this.x - k.x;
        const dy = this.y - k.y;
        if (dx * dx + dy * dy < 30 * 30) {
          k.taken = true;
          this.keys += 1;
          return k.label;
        }
      }
    }
    return null;
  }

  // Inside the exit doorway, and only once every document is held.
  // The door is a vertical strip on the right wall: approach it from the left.
  atExit() {
    return (
      this.keys >= KEY_SPOTS.length &&
      this.x > EXIT.x - 30 &&
      this.x < EXIT.x + EXIT.w + 6 &&
      this.y > EXIT.y - 6 &&
      this.y < EXIT.y + EXIT.h + 6
    );
  }
}
