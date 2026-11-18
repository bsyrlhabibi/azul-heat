'use strict';
/* Azul Heat — side gigs, for money between story beats: checkpoint
   street races on the Strip and timed courier runs out of the Docks.
   Start one at its glowing marker (E), finish for cash and reputation. */
AH.Gigs = (function () {
  const R = AH.Rng, U = AH.U, C = AH.CFG;

  const SPOTS = [
    { kind: 'race', name: 'Strip Sprint — street race', x: 2020, y: 300 },
    { kind: 'courier', name: 'Docks Courier — timed run', x: 3170, y: 3290 },
  ];

  function nearestSpot(x, y) {
    for (const s of SPOTS) if (U.dist(x, y, s.x, s.y) < 58) return s;
    return null;
  }

  function tryStart(x, y) {
    const G = AH.G;
    if (G.gig || G.gigCooldown > 0) return false;
    const s = nearestSpot(x, y);
    if (!s) return false;
    if (s.kind === 'race') {
      const cps = [];
      for (let i = 0; i < 6; i++) cps.push(AH.World.randomRoadPoint());
      G.gig = { kind: 'race', cps, i: 0, t: 0, par: 150 };
      AH.banner('STRIP SPRINT', 'Hit every checkpoint — beat ' + G.gig.par + 's for the bonus.', '#37e0ff', 3);
    } else {
      const drop = AH.World.randomRoadPoint();
      G.gig = { kind: 'courier', cps: [drop], i: 0, t: 75, par: 0 };
      AH.banner('DOCK COURIER', 'One package, 75 seconds. The city pays for speed.', '#37e0ff', 3);
    }
    AH.Audio.blip(760);
    return true;
  }

  function objective() {
    const G = AH.G, g = G.gig;
    const cp = g.cps[g.i];
    if (g.kind === 'race') return { x: cp.x, y: cp.y, label: 'Race checkpoint ' + (g.i + 1) + '/' + g.cps.length + ' — ' + g.t.toFixed(0) + 's' };
    return { x: cp.x, y: cp.y, label: 'Deliver the package — ' + Math.ceil(g.t) + 's left' };
  }

  function finish(g) {
    const G = AH.G, P = G.player;
    let pay = g.kind === 'race' ? 260 + Math.max(0, Math.floor((g.par - g.t) * 4)) : 300;
    AH.Economy.addCash(pay, P.x, P.y);
    AH.Economy.addRep(P.x, P.y, 5);
    if (g.kind === 'race') { G.stats.racesWon++; AH.banner('RACE WON', 'Strip Sprint — $' + pay, '#8dff57', 3); }
    else { G.stats.deliveries++; AH.banner('DELIVERED', 'Dock Courier — $' + pay, '#8dff57', 3); }
    AH.Audio.fanfare();
    G.gig = null; G.gigCooldown = 20;
    AH.Save.write();
  }

  function update(dt) {
    const G = AH.G, P = G.player;
    G.gigCooldown = Math.max(0, G.gigCooldown - dt);
    if (!G.gig) return;
    const g = G.gig, cp = g.cps[g.i];
    if (g.kind === 'race') g.t += dt; else { g.t -= dt; if (g.t <= 0) { AH.banner('GIG FAILED', 'The package went cold.', '#ff5964', 2.6); G.gig = null; G.gigCooldown = 10; return; } }
    if (P.inCar && U.dist(P.x, P.y, cp.x, cp.y) < 92) {
      g.i++;
      AH.Audio.blip(980);
      if (g.i >= g.cps.length) finish(g);
    }
  }

  function prompt(x, y) {
    const G = AH.G;
    if (G.gig || G.gigCooldown > 0) return null;
    const s = nearestSpot(x, y);
    return s ? 'E — Start gig: ' + s.name : null;
  }

  return { SPOTS, tryStart, update, objective, prompt };
})();
