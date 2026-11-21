// input.js — keyboard + mouse.
// One job: turn physical input into a movement direction and game commands.
// main.js polls this each frame; nothing else reads the DOM events.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    sneak: false,
    clickTile: null, // {x, y} tile the player clicked, consumed by main.js
    pressed: new Set(), // edge-triggered keys, consumed by main.js
  };

  const KEY_DIRS = {
    KeyW: [-1, -1], ArrowUp: [-1, -1],
    KeyS: [1, 1], ArrowDown: [1, 1],
    KeyA: [-1, 1], ArrowLeft: [-1, 1],
    KeyD: [1, -1], ArrowRight: [1, -1],
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
    // Sneak while either Shift is held, or while Space is held down.
    input.sneak = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.keys.has('Space');
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    input.sneak = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.keys.has('Space');
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.sneak = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    input.clickTile = { sx, sy }; // main.js converts to tile coords
  });

  // Movement direction in tile space, from whatever keys are held.
  input.direction = function direction() {
    let x = 0;
    let y = 0;
    for (const code of input.keys) {
      const d = KEY_DIRS[code];
      if (d) { x += d[0]; y += d[1]; }
    }
    return { x, y };
  };

  // True once for a key pressed since the last check.
  input.wasPressed = function wasPressed(code) {
    if (input.pressed.has(code)) {
      input.pressed.delete(code);
      return true;
    }
    return false;
  };

  input.consumeClick = function consumeClick() {
    const c = input.clickTile;
    input.clickTile = null;
    return c;
  };

  return input;
}
