// player.js — the thief: run, sneak, climb pipes, crawl vents, make noise.
// Noise is the second stealth currency: fast feet and hard landings travel.

import { LEVEL, PLATFORMS, PIPES, ventAt } from './level.js';

export function createPlayer() {
  return {
    x: 60, y: LEVEL.groundY, vx: 0, vy: 0,
    w: 22, h: 52,
    facing: 1,                 // 1 = right, -1 = left
    onGround: true,
    sneaking: false,
    crawling: false,
    climbing: false,
    noise: 0,                  // 0..1, decays each frame; guards hear it
    noisePulse: 0,             // recent noise event strength for the HUD ring
    light: 0.05,               // light level at the thief's chest
    hidden: true,              // in shadow right now
    stepTimer: 0,
    moving: false,
  };
}

// Nearest pipe the player can grab (within reach, roughly at body height).
function pipeNear(p) {
  for (const pipe of PIPES) {
    if (Math.abs(p.x - pipe.x) < 16 && p.y >= pipe.yTop - 10 && p.y <= pipe.yBottom + 10) return pipe;
  }
  return null;
}

export function updatePlayer(p, input, dt, time) {
  const speed = p.crawling ? 0.9 : p.sneaking ? 1.5 : 3.4;
  let move = 0;
  if (input.left) move -= 1;
  if (input.right) move += 1;

  // Climbing: hold Up beside a pipe.
  const pipe = pipeNear(p);
  if (pipe && input.up && !p.crawling) {
    p.climbing = true;
    p.vy = 0;
    p.y -= 2.2 * dt;
    p.x = pipe.x;
    if (p.y <= pipe.yTop) { p.y = pipe.yTop; p.climbing = false; }
    p.moving = true;
  } else if (p.climbing && input.down) {
    p.y += 2.2 * dt;
    if (p.y >= pipe.yBottom) { p.y = pipe.yBottom; p.climbing = false; }
    p.moving = true;
  } else {
    p.climbing = false;
  }

  if (!p.climbing) {
    p.vx = move * speed;
    p.x += p.vx * dt;
    p.moving = move !== 0;
    if (move !== 0) p.facing = move;

    // Gravity and platform landing.
    p.vy += LEVEL.gravity * dt;
    p.y += p.vy * dt;
    p.onGround = false;
    for (const plat of PLATFORMS) {
      if (p.x + p.w / 2 > plat.x && p.x - p.w / 2 < plat.x + plat.w) {
        const feet = p.y;
        const prevFeet = feet - p.vy * dt;
        if (p.vy >= 0 && prevFeet <= plat.y + 2 && feet >= plat.y - 2) {
          if (p.vy > 9) makeNoise(p, 0.9, 'landing'); // hard landing is loud
          p.y = plat.y;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }
    // Jump with Up when standing (not while crawling).
    if (input.upPressed && p.onGround && !p.crawling) {
      p.vy = -11.5;
      p.onGround = false;
      makeNoise(p, 0.25, 'jump');
    }
    // Drop through a ledge with Down + Jump.
    if (input.down && input.upPressed && p.onGround) {
      p.y += 4;
    }
  }

  // Sneak / crawl toggles.
  p.sneaking = input.sneak && !p.crawling;
  const vent = ventAt(p.x, p.y - 20);
  if (input.crawlPressed) p.crawling = !p.crawling && (vent || p.onGround);
  if (p.crawling && !vent && p.onGround && move === 0) {
    // crawling is allowed on the floor too, but slow
  }
  if (p.crawling) p.h = 26; else p.h = 52;

  // Footsteps: noise and a soft tick, louder and faster when running.
  p.noise = Math.max(0, p.noise - 0.02 * dt);
  p.noisePulse = Math.max(0, p.noisePulse - 0.05 * dt);
  if (p.moving && p.onGround && !p.climbing) {
    p.stepTimer += dt * (p.crawling ? 0.5 : p.sneaking ? 0.7 : 1.6);
    if (p.stepTimer > 22) {
      p.stepTimer = 0;
      const loud = p.crawling ? 0.08 : p.sneaking ? 0.15 : 0.5;
      makeNoise(p, loud, 'step');
      p.stepped = true;
    } else {
      p.stepped = false;
    }
  } else {
    p.stepped = false;
  }

  // Walls of the hall.
  p.x = Math.max(18, Math.min(LEVEL.width - 18, p.x));
  if (p.y > LEVEL.groundY) { p.y = LEVEL.groundY; p.vy = 0; p.onGround = true; }
  return p;
}

export function makeNoise(p, amount, kind) {
  p.noise = Math.min(1, Math.max(p.noise, amount));
  p.noisePulse = Math.max(p.noisePulse, amount);
  p.lastNoiseKind = kind;
}
