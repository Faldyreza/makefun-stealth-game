// player.js — the thief. Movement, sneaking, noise, relic pickup.
// The player is a circle that slides along walls; holding Shift sneaks
// (slower, quieter, much harder to spot). Clicking the floor sets a
// walk target so the game also plays with the mouse alone.

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 178;
export const SNEAK_SPEED = 86;

export function createPlayer(level) {
  return {
    x: level.spawn.x,
    y: level.spawn.y,
    radius: PLAYER_RADIUS,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    speedNow: 0,
    // Click-to-move target, null when the keys are driving.
    clickTarget: null,
    stepPhase: 0,
    stepDue: false,
  };
}

// Read the keyboard state (and an optional click target) and move the
// player one frame. dt is seconds. Returns nothing; the player object
// is updated in place.
export function updatePlayer(player, level, input, dt) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    // Keys win over a click target.
    player.clickTarget = null;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  } else if (player.clickTarget) {
    const tx = player.clickTarget.x - player.x;
    const ty = player.clickTarget.y - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 8) {
      player.clickTarget = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }

  player.sneaking = !!input.sneak;
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  player.moving = dx !== 0 || dy !== 0;
  player.speedNow = player.moving ? speed : 0;

  if (player.moving) {
    player.facing = Math.atan2(dy, dx);
    // Move one axis at a time so the player slides along walls.
    player.x += dx * speed * dt;
    level.resolveCircle(player, player.radius);
    player.y += dy * speed * dt;
    level.resolveCircle(player, player.radius);
    player.x = Math.max(player.radius + 20, Math.min(1280 - player.radius - 20, player.x));
    player.y = Math.max(player.radius + 20, Math.min(720 - player.radius - 20, player.y));
    // Footstep timing: a step every ~0.34 s walking, ~0.55 s sneaking.
    player.stepPhase += dt * (player.sneaking ? 1.8 : 2.9);
    if (player.stepPhase >= 1) {
      player.stepPhase -= 1;
      player.stepDue = true;
    }
  }
}

// How easy is this player to spot right now? 1.0 walking in the open,
// much less while sneaking or standing still.
export function playerVisibility(player) {
  if (!player.moving) return 0.55;
  return player.sneaking ? 0.45 : 1.0;
}

// Collect any relic the player is touching. Returns the relic taken, or null.
export function collectRelics(player, level) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const dx = player.x - relic.x;
    const dy = player.y - relic.y;
    if (dx * dx + dy * dy < 26 * 26) {
      relic.taken = true;
      return relic;
    }
  }
  return null;
}

export function relicsCollected(level) {
  let n = 0;
  for (const relic of level.relics) if (relic.taken) n++;
  return n;
}

// True when the player stands in the glowing exit doorway.
export function playerAtExit(player, level) {
  const e = level.exit;
  return (
    player.x > e.x - 6 &&
    player.x < e.x + e.w + 6 &&
    player.y > e.y - 4 &&
    player.y < e.y + e.h + 14
  );
}
