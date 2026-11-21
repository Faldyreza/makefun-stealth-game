// level.js — the sunlit museum atrium: floor, cover, pedestals, exit, balcony.
// One job: describe the place. No movement, no AI, no drawing here — just
// the map every other file reads.

// Cover kinds. Every cover object blocks line of sight AND blocks walking:
// a guard's cone stops at a planter, a statue, a crate or a column.
export const COVER_KINDS = {
  planter: { label: 'Planter', radius: 0.62, height: 34, leaf: '#2e9e5b', pot: '#c65d21' },
  statue: { label: 'Statue', radius: 0.55, height: 58, leaf: '#f4efe2', pot: '#d8cdb2' },
  crate: { label: 'Crate', radius: 0.6, height: 30, leaf: '#e08a2e', pot: '#b96a1d' },
  column: { label: 'Column', radius: 0.5, height: 74, leaf: '#2a9d8f', pot: '#1f7a6e' },
};

// Cover placement, chosen so patrol lanes stay clear (each object is at
// least ~1 tile from every guard route) while the floor stays full of
// hiding spots between the pedestals and the exit.
export const COVER = [
  { kind: 'planter', x: 3, y: 4 },
  { kind: 'planter', x: 10, y: 6 },
  { kind: 'planter', x: 9, y: 3 },
  { kind: 'planter', x: 7, y: 10 },
  { kind: 'statue', x: 4, y: 10 },
  { kind: 'statue', x: 7, y: 4 },
  { kind: 'crate', x: 10, y: 10 },
  { kind: 'crate', x: 3, y: 9 },
  { kind: 'crate', x: 10, y: 7 },
  { kind: 'column', x: 5, y: 3 },
  { kind: 'column', x: 8, y: 10 },
];

// The three artifacts, each on a glowing pedestal. Steal all three.
export const ARTIFACTS = [
  { id: 'sun', name: 'Sun Disk', x: 3, y: 5, color: '#ffb703' },
  { id: 'falcon', name: 'Jade Falcon', x: 10, y: 4, color: '#06d6a0' },
  { id: 'scarab', name: 'Golden Scarab', x: 5, y: 10, color: '#ff6d00' },
];

// The exit: a big green glowing doorway in the south-east corner.
// Locked until every artifact is collected.
export const EXIT = { x: 12.6, y: 12.6, radius: 0.9 };

// The balcony: a raised marble slab along the north edge, a vantage route
// where guards spot you half as fast. Reach it by walking north off any
// tile in row 1 — the steps are at the balcony's south edge.
export const BALCONY = { x0: 4, x1: 9, y0: 0, y1: 0, height: 30 };

// The white step tiles leading up onto the balcony, drawn as shallow slabs.
export const BALCONY_STEPS = [
  { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }, { x: 8, y: 1 },
];

export function isBalconyTile(x, y) {
  return x >= BALCONY.x0 && x <= BALCONY.x1 && y >= BALCONY.y0 && y <= BALCONY.y1;
}

// True when tile (x, y) sits inside any cover object's footprint.
export function coverAt(x, y) {
  for (const c of COVER) {
    const dx = x - (c.x + 0.5);
    const dy = y - (c.y + 0.5);
    if (dx * dx + dy * dy < c.radius * c.radius) return c;
  }
  return null;
}

// True when tile (x, y) sits inside a pedestal's footprint.
export function pedestalAt(x, y) {
  for (const a of ARTIFACTS) {
    const dx = x - (a.x + 0.5);
    const dy = y - (a.y + 0.5);
    if (dx * dx + dy * dy < 0.45 * 0.45) return a;
  }
  return null;
}

// Segment (ax,ay)-(bx,by) in tile space: is line of sight blocked by cover?
// A cover disc blocks the view when the segment passes within its radius.
export function lineBlocked(ax, ay, bx, by) {
  for (const c of COVER) {
    const cx = c.x + 0.5;
    const cy = c.y + 0.5;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx - cx;
    const py = ay + t * dy - cy;
    if (px * px + py * py < c.radius * c.radius) return true;
  }
  return false;
}

// Where the thief starts: the south-west service door, out of every cone.
export const PLAYER_START = { x: 1.5, y: 12.5 };

// Guard patrol routes (tile waypoints, looped). Lanes were picked clear
// of cover so a guard never walks into a planter mid-patrol.
export const GUARD_ROUTES = [
  { name: 'Rosa', waypoints: [[2.5, 2.5], [11.5, 2.5], [11.5, 11.5], [2.5, 11.5]] },
  { name: 'Bram', waypoints: [[5.5, 5.5], [8.5, 5.5], [8.5, 8.5], [5.5, 8.5]] },
  { name: 'Ines', waypoints: [[1.5, 6.5], [6.5, 6.5], [6.5, 12.5], [1.5, 12.5]] },
  { name: 'Tomas', waypoints: [[12.5, 1.5], [12.5, 6.5], [12.5, 11.5]] },
];
