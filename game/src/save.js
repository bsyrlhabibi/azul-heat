'use strict';
/* Azul Heat — persistence. The whole run (cash, reputation, story
   progress, safehouses, stats, who's leading) lives in localStorage
   and is written on every payday, purchase and mission end. */
AH.Save = (function () {
  function write() {
    const G = AH.G;
    try {
      localStorage.setItem(AH.CFG.saveKey, JSON.stringify({
        cash: G.cash, rep: G.rep, storyDone: G.storyDone,
        safehouses: G.safehouses, stats: G.stats,
        charId: G.player ? G.player.charId : 0,
        px: G.player ? Math.round(G.player.x) : null,
        py: G.player ? Math.round(G.player.y) : null,
      }));
    } catch (e) { /* private mode etc. — the run simply won't persist */ }
  }

  function read() {
    try {
      const raw = localStorage.getItem(AH.CFG.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function apply(data) {
    if (!data) return false;
    const G = AH.G;
    G.cash = data.cash | 0;
    if (Array.isArray(data.rep)) G.rep = data.rep.slice(0, 6);
    G.storyDone = data.storyDone | 0;
    Object.assign(G.safehouses, data.safehouses || {});
    Object.assign(G.stats, data.stats || {});
    if (G.player && data.px) {
      const lead = data.charId === 1 ? 1 : 0;
      if (lead !== G.player.charId) AH.Chars.switchRunner();
      G.player.x = data.px; G.player.y = data.py;
      const res = AH.World.collide(G.player.x, G.player.y, 12);
      G.player.x = res.x; G.player.y = res.y;
    }
    return true;
  }

  function wipe() {
    try { localStorage.removeItem(AH.CFG.saveKey); } catch (e) {}
  }

  return { write, read, apply, wipe };
})();
