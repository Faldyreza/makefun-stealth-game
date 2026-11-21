// input.js — keyboard plus mouse. WASD / arrows move, Shift sneaks,
// P pauses, R restarts, M mutes. Clicking the floor sets a walk target
// (click-to-move), so the game also plays with the mouse alone.

export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    click: null, // { x, y } in canvas pixels, consumed by main.js
  };

  const keyMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (e) => {
    if (keyMap[e.code] !== undefined) {
      input[keyMap[e.code]] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyP' && !e.repeat) input.pausePressed = true;
    if (e.code === 'KeyR' && !e.repeat) input.restartPressed = true;
    if (e.code === 'KeyM' && !e.repeat) input.mutePressed = true;
  });

  window.addEventListener('keyup', (e) => {
    if (keyMap[e.code] !== undefined) input[keyMap[e.code]] = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  });

  // Blur clears held keys so the player never walks off on its own.
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  });

  return input;
}
