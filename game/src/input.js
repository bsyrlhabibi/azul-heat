// input.js — keyboard and mouse capture. Modules poll `keys` for held
// controls and consume one-shot presses through `pressed`.

export const keys = {};
const pressQueue = new Set();
export const mouse = { x: 0, y: 0, down: false, clicked: false };

export function pressed(code) {
  if (pressQueue.has(code)) { pressQueue.delete(code); return true; }
  return false;
}
export function held(...codes) { return codes.some((c) => keys[c]); }

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressQueue.add(e.code);
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrameInput() { mouse.clicked = false; pressQueue.clear(); }
