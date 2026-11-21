// iso.js — isometric projection, tile math and depth sorting.
// One job: turn tile coordinates into screen pixels and back, and order
// things so nearer objects draw over farther ones. Pure math, no drawing.

// A tile is 76 px wide and 38 px tall on screen — deliberately LARGE, so
// the floor fills the canvas and every shape still reads at thumbnail size.
// The floor is a diamond grid; tile (x, y) projects to the diamond whose
// centre is here.
export const TILE_W = 76;
export const TILE_H = 38;
export const GRID = 14; // 14 x 14 tiles of sunlit atrium floor

// Origin: screen position of tile (0, 0). Floor spans about 1064 px wide
// and 532 px tall, centred on a 1280x720 canvas with room for the HUD.
export const ORIGIN_X = 640;
export const ORIGIN_Y = 82;

// Tile (x, y) at height z (px above the floor) -> screen point.
export function tileToScreen(x, y, z = 0) {
  return {
    x: ORIGIN_X + (x - y) * (TILE_W / 2),
    y: ORIGIN_Y + (x + y) * (TILE_H / 2) - z,
  };
}

// Screen point -> fractional tile coordinates (z ignored, floor plane).
export function screenToTile(sx, sy) {
  const dx = (sx - ORIGIN_X) / (TILE_W / 2);
  const dy = (sy - ORIGIN_Y) / (TILE_H / 2);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

// Depth key: larger x + y means nearer the viewer (drawn later / on top).
export function depthOf(x, y) {
  return x + y;
}

// Sort a list of drawable things (each with x, y tile coords) front to back.
export function sortByDepth(items) {
  return items.slice().sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y));
}

// Clamp a tile position inside the walkable floor, keeping a margin from
// the surrounding walls.
export function clampToFloor(x, y, margin = 0.6) {
  const lo = margin;
  const hi = GRID - 1 - margin + 1; // tiles run 0..GRID-1, centres at +0.5
  return {
    x: Math.max(lo, Math.min(GRID - lo, x)),
    y: Math.max(lo, Math.min(GRID - lo, y)),
  };
}

// Distance in tile units between two tile points.
export function tileDist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

// Angle (radians, screen space) from tile A to tile B, for vision cones.
export function tileAngle(ax, ay, bx, by) {
  const a = tileToScreen(ax, ay);
  const b = tileToScreen(bx, by);
  return Math.atan2(b.y - a.y, b.x - a.x);
}
