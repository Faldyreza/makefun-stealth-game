// input.js — keyboard + mouse. Arrows / WASD to move, Shift to sneak,
// C to crawl, Up to jump or climb pipes, P pause, M mute, R restart.
// Clicking the canvas also wakes audio (browsers require a gesture).

export function createInput() {
  const input = {
    left: false, right: false, up: false, down: false,
    sneak: false, upPressed: false, crawlPressed: false,
    pausePressed: false, mutePressed: false, restartPressed: false,
    anyPressed: false,
  };

  const down = (e) => {
    input.anyPressed = true;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = true; break;
      case 'ArrowRight': case 'KeyD': input.right = true; break;
      case 'ArrowUp': case 'KeyW':
        if (!input.up) input.upPressed = true;
        input.up = true; break;
      case 'ArrowDown': case 'KeyS': input.down = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.sneak = true; break;
      case 'KeyC': input.crawlPressed = true; break;
      case 'KeyP': case 'Escape': input.pausePressed = true; break;
      case 'KeyM': input.mutePressed = true; break;
      case 'KeyR': input.restartPressed = true; break;
      case 'Enter': case 'Space': input.anyPressed = true; break;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  };
  const up = (e) => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = false; break;
      case 'ArrowRight': case 'KeyD': input.right = false; break;
      case 'ArrowUp': case 'KeyW': input.up = false; break;
      case 'ArrowDown': case 'KeyS': input.down = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.sneak = false; break;
    }
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousedown', () => { input.anyPressed = true; });
  return input;
}

// Edge-triggered flags are consumed once per frame by the game loop.
export function consumeEdges(input) {
  const edges = {
    upPressed: input.upPressed,
    crawlPressed: input.crawlPressed,
    pausePressed: input.pausePressed,
    mutePressed: input.mutePressed,
    restartPressed: input.restartPressed,
  };
  input.upPressed = false;
  input.crawlPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
  input.restartPressed = false;
  return edges;
}
