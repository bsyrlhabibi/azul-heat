'use strict';
/* Azul Heat — keyboard and mouse. `key` is level-triggered (held),
   `pressed` is edge-triggered and consumed once per frame by whoever
   asks first — menus and the game never fight over the same press. */
AH.Input = (function () {
  const held = new Set(), edge = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let canvas = null;

  function init(cv) {
    canvas = cv;
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) edge.add(e.code);
      held.add(e.code);
      AH.Audio.ensure();
    });
    window.addEventListener('keyup', e => held.delete(e.code));
    window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (AH.CFG.viewW / r.width);
      mouse.y = (e.clientY - r.top) * (AH.CFG.viewH / r.height);
    });
    cv.addEventListener('mousedown', e => { mouse.down = true; mouse.clicked = true; AH.Audio.ensure(); });
    window.addEventListener('mouseup', () => { mouse.down = false; });
  }

  function key(code) { return held.has(code); }
  function pressed(code) {
    if (edge.has(code)) { edge.delete(code); return true; }
    return false;
  }
  function endFrame() { edge.clear(); mouse.clicked = false; }
  function mouseWorld() {
    const G = AH.G;
    return { x: G.cam.x + (mouse.x - AH.CFG.viewW / 2), y: G.cam.y + (mouse.y - AH.CFG.viewH / 2) };
  }

  return { init, key, pressed, endFrame, mouse, mouseWorld };
})();
