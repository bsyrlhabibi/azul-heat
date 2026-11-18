'use strict';
/* Azul Heat — money and standing. Cash from missions and gigs, rent and
   fines out; reputation per district that grows where you work; and
   safehouses — buy one and it becomes your heal / save / respawn point. */
AH.Economy = (function () {
  const U = AH.U;

  const HOUSES = [
    { key: 'marinaRoom', name: 'Carmen\'s Spare Room — Marina', price: 0 },
    { key: 'oldTownFlat', name: 'Old Town Flat', price: 1500 },
    { key: 'stripSuite', name: 'Hotel Sol Suite — Neon Strip', price: 4500 },
    { key: 'palmVilla', name: 'Palm Hills Villa', price: 6500 },
  ];

  function addCash(n, x, y) {
    const G = AH.G;
    G.cash += n;
    if (n > 0) G.stats.earned += n;
    if (x !== undefined) AH.floater(x, y - 26, (n >= 0 ? '+$' : '-$') + Math.abs(n), n >= 0 ? '#8dff57' : '#ff5964');
    AH.Audio.cash();
  }

  function addRep(x, y, n) {
    const G = AH.G, di = AH.World.districtAt(x, y);
    G.rep[di] = U.clamp(G.rep[di] + n, 0, 100);
  }

  function nearestHouse(x, y) {
    let best = null, bd = 60 * 60;
    for (const h of HOUSES) {
      const s = AH.SAFEHOUSE_SPOTS[h.key];
      const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  /* E pressed with no car in reach: safehouse business happens here. */
  function tryInteract(x, y) {
    const G = AH.G, P = G.player;
    const h = nearestHouse(x, y);
    if (!h) return false;
    if (G.safehouses[h.key]) {
      P.hp = 100;
      AH.toast(h.name + ' — rested, healed, game saved.');
      AH.Save.write();
      AH.Audio.blip(520);
      return true;
    }
    if (G.cash >= h.price) {
      G.cash -= h.price; G.safehouses[h.key] = true;
      AH.banner('SAFEHOUSE BOUGHT', h.name + ' is yours. Rest there to heal and save.', '#8dff57', 3.6);
      addRep(x, y, 6);
      AH.Save.write();
    } else {
      AH.toast(h.name + ' — $' + h.price + '. You have $' + G.cash + '.');
      AH.Audio.blip(180);
    }
    return true;
  }

  function promptAt(x, y) {
    const h = nearestHouse(x, y);
    if (!h) return null;
    const G = AH.G;
    return G.safehouses[h.key] ? 'E — Rest at ' + h.name : 'E — Buy ' + h.name + ' ($' + h.price + ')';
  }

  return { HOUSES, addCash, addRep, tryInteract, promptAt, nearestHouse };
})();
