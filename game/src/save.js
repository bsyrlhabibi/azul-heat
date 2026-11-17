// Azul Heat — save.js: the save game in localStorage. Cash, district reputation,
// finished missions, ammunition and the garage car survive a reload; the title
// screen offers Continue when a save exists.

import { G } from './state.js';

const KEY = 'azul-heat-save-v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function saveGame() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: G.cash, rep: G.rep, ammo: G.ammo,
      missionsDone: G.missionsDone, garageCar: G.garageCar,
      runner: G.player ? G.player.id : 'lucia',
    }));
  } catch { /* storage unavailable: the run simply is not saved */ }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    G.cash = data.cash ?? G.cash;
    G.rep = data.rep || {};
    G.ammo = data.ammo ?? G.ammo;
    G.missionsDone = data.missionsDone || [];
    G.garageCar = data.garageCar || null;
    return data;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
