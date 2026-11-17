// save.js — persists a run to localStorage: cash, reputation, finished
// missions, the garage car and where each runner is standing.

import { G } from './state.js';

const KEY = 'azul-heat-save-v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function saveGame() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: G.cash, rep: G.rep, missionsDone: G.missionsDone,
      garage: G.garage, active: G.active, stats: G.stats,
      pos: { lucia: { x: G.runners.lucia.x, y: G.runners.lucia.y }, marco: { x: G.runners.marco.x, y: G.runners.marco.y } },
      hp: { lucia: G.runners.lucia.hp, marco: G.runners.marco.hp },
    }));
  } catch { /* storage unavailable: the run simply is not saved */ }
}

export function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return false;
    G.cash = d.cash ?? G.cash; G.rep = d.rep || {}; G.missionsDone = d.missionsDone || [];
    G.garage = d.garage || null; G.active = d.active || 'lucia'; G.stats = d.stats || G.stats;
    for (const id of ['lucia', 'marco']) {
      if (d.pos && d.pos[id]) { G.runners[id].x = d.pos[id].x; G.runners[id].y = d.pos[id].y; }
      if (d.hp && d.hp[id]) G.runners[id].hp = d.hp[id];
    }
    return true;
  } catch { return false; }
}
