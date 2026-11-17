// Azul Heat — input.js: keyboard and mouse state. Other modules poll `keys`, `mouse`
// and the edge-triggered `pressed` set each frame; one-shot actions (switch runner,
// open map) read `pressed` so a held key never fires twice.

export const keys = {};
export const pressed = {};
export const mouse = { x: 0, y: 0, down: false, clicked: false };

const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'];

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
  });
  addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
  });
  canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** Called at the end of every frame: edge triggers last exactly one frame. */
export function endFrameInput() {
  for (const k in pressed) delete pressed[k];
  mouse.clicked = false;
}

export function moveAxis() {
  const x = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);
  const y = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);
  return { x, y };
}
