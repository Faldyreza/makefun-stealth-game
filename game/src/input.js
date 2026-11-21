// input.js — keyboard (WASD / arrows, Shift sneak, P pause, R restart,
// M mute) and click-to-move. Coordinates are converted from the scaled
// canvas back into the 1280x720 game space.

export class Input {
  constructor(canvas, onAction) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.canvas = canvas;
    this.onAction = onAction; // (action) => void for pause/restart/mute/enter
    this.click = null;         // {x, y} in game space, consumed by main

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.up = true; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': this.down = true; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': this.left = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': this.right = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': this.sneak = true; break;
        case 'KeyP': this.onAction('pause'); break;
        case 'KeyR': this.onAction('restart'); break;
        case 'KeyM': this.onAction('mute'); break;
        case 'Enter': this.onAction('enter'); break;
        case 'Escape': this.onAction('pause'); break;
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.up = false; break;
        case 'KeyS': case 'ArrowDown': this.down = false; break;
        case 'KeyA': case 'ArrowLeft': this.left = false; break;
        case 'KeyD': case 'ArrowRight': this.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.sneak = false; break;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (1280 / rect.width);
      const y = (e.clientY - rect.top) * (720 / rect.height);
      this.click = { x, y };
      this.onAction('click');
    });
    window.addEventListener('blur', () => {
      this.up = this.down = this.left = this.right = this.sneak = false;
    });
  }

  /** Take the pending click target (null when there is none). */
  takeClick() {
    const c = this.click;
    this.click = null;
    return c;
  }
}
