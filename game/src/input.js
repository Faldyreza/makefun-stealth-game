// input.js — keyboard state: WASD + arrows to move, Shift to sneak.
// Edge-triggered keys (pause, restart, mute) are consumed once per press.

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // edge-triggered, cleared each frame by main.js
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(e) {
    if (MOVE_KEYS[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault();
    }
    if (!e.repeat) this.pressed.add(e.code);
    this.down.add(e.code);
  }

  onKeyUp(e) {
    this.down.delete(e.code);
  }

  axisX() {
    let x = 0;
    for (const code of this.down) {
      const v = MOVE_KEYS[code];
      if (v) x += v[0];
    }
    return x;
  }

  axisY() {
    let y = 0;
    for (const code of this.down) {
      const v = MOVE_KEYS[code];
      if (v) y += v[1];
    }
    return y;
  }

  sneak() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }

  // True once per physical press; main.js clears the set after each frame.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }
}
