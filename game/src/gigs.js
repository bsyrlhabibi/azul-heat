// Azul Heat — gigs.js: repeatable side work between story missions. Street races
// run a fixed checkpoint loop against the clock, courier runs pay by distance
// against a generous timer, and rampages pay for measured chaos — every point of
// car damage dealt while the clock runs, counted honestly frame by frame.

import { G } from './state.js';
import { randomRoadPoint } from './world.js';
import { addCash, addRep } from './economy.js';
import { sendMessage } from './phone.js';
import { sfx } from './audio.js';

export const GIG_SPOTS = [
  { id: 'race', name: 'STREET RACE', x: 1540, y: 980, color: '#ffd75e' },
  { id: 'courier', name: 'COURIER', x: 2660, y: 2100, color: '#4dd0e1' },
  { id: 'rampage', name: 'RAMPAGE', x: 480, y: 1330, color: '#ff5252' },
];
const RACE_POINTS = [
  { x: 2100, y: 980 }, { x: 2660, y: 980 }, { x: 2660, y: 1540 }, { x: 2100, y: 2100 },
  { x: 1540, y: 2100 }, { x: 980, y: 1540 }, { x: 980, y: 980 }, { x: 1540, y: 980 },
];
let raceBest = 0;
const prevHp = new Map();

export function gigPrompt() {
  if (G.mission || G.gig) return null;
  for (const spot of GIG_SPOTS) {
    if (Math.hypot(G.player.x - spot.x, G.player.y - spot.y) < 54) {
      return spot.id === 'race' && !G.player.inCar ? 'The race needs a car — E when you are driving' : `E — start: ${spot.name}`;
    }
  }
  return null;
}

export function tryGigInteract() {
  if (G.mission || G.gig) return false;
  for (const spot of GIG_SPOTS) {
    if (Math.hypot(G.player.x - spot.x, G.player.y - spot.y) >= 54) continue;
    if (spot.id === 'race') {
      if (!G.player.inCar) return true; // prompt already explains
      G.gig = { id: 'race', cp: 0, t: 0 };
      G.objective = 'Race: hit every checkpoint';
    } else if (spot.id === 'courier') {
      const pickup = randomRoadPoint(G.rng);
      G.gig = { id: 'courier', stage: 'pickup', x: pickup.x, y: pickup.y, t: 0, limit: 0 };
      G.objective = 'Courier: reach the pickup';
    } else {
      G.gig = { id: 'rampage', t: 60, chaos: 0 };
      prevHp.clear();
      for (const car of G.cars) prevHp.set(car.id, car.hp);
      G.objective = 'Rampage: wreck cars, rack up chaos';
    }
    sfx.click();
    return true;
  }
  return false;
}

function finish(text, pay) {
  addCash(pay);
  addRep(G.player.x, G.player.y, 5);
  G.banner = { title: 'GIG COMPLETE', sub: `${text} — $${pay}`, until: G.time + 2.4 };
  G.gig = null;
  G.objective = '';
  sfx.jingle();
}

function fail(text) {
  G.banner = { title: 'GIG FAILED', sub: text, until: G.time + 2.2 };
  G.gig = null;
  G.objective = '';
  sfx.fail();
}

export function updateGigs(dt) {
  const g = G.gig;
  if (!g || G.screen !== 'play') return;
  const p = G.player, pos = p.inCar || p;
  if (g.id === 'race') {
    g.t += dt;
    const target = RACE_POINTS[g.cp];
    G.objective = `Race: checkpoint ${g.cp + 1}/${RACE_POINTS.length} — ${g.t.toFixed(1)}s${raceBest ? ` · best ${raceBest.toFixed(1)}s` : ''}`;
    if (Math.hypot(pos.x - target.x, pos.y - target.y) < 74) {
      g.cp++;
      sfx.pickup();
      if (g.cp >= RACE_POINTS.length) {
        const pay = Math.max(160, Math.round(760 - g.t * 4));
        if (!raceBest || g.t < raceBest) { raceBest = g.t; sendMessage('DJ Prisma', `New street record: ${g.t.toFixed(1)}s. The Strip noticed.`); }
        finish(`Finished in ${g.t.toFixed(1)}s`, pay);
      }
    }
  } else if (g.id === 'courier') {
    if (g.stage === 'pickup') {
      if (Math.hypot(pos.x - g.x, pos.y - g.y) < 56) {
        const drop = randomRoadPoint(G.rng);
        const dist = Math.hypot(drop.x - g.x, drop.y - g.y);
        g.stage = 'drop'; g.x = drop.x; g.y = drop.y;
        g.limit = Math.max(40, dist / 11); g.t = g.limit;
        sfx.pickup();
        G.objective = 'Courier: deliver the package';
      }
    } else {
      g.t -= dt;
      G.objective = `Courier: deliver — ${Math.max(0, Math.ceil(g.t))}s left`;
      if (g.t <= 0) { fail('The package went cold.'); return; }
      if (Math.hypot(pos.x - g.x, pos.y - g.y) < 56) {
        finish('Package delivered', 150 + Math.round(g.limit * 2.2));
      }
    }
  } else if (g.id === 'rampage') {
    g.t -= dt;
    for (const car of G.cars) {
      const before = prevHp.get(car.id);
      if (before !== undefined && car.hp < before) g.chaos += (before - car.hp) * 0.6;
      prevHp.set(car.id, car.hp);
    }
    G.objective = `Rampage: ${Math.floor(g.chaos)} chaos — ${Math.max(0, Math.ceil(g.t))}s`;
    if (g.t <= 0) finish(`${Math.floor(g.chaos)} chaos`, Math.round(g.chaos));
  }
}

/** The active gig's target for markers and the minimap. */
export function gigMarker() {
  const g = G.gig;
  if (!g) return null;
  if (g.id === 'race') return RACE_POINTS[g.cp];
  if (g.id === 'courier') return { x: g.x, y: g.y };
  return null;
}
