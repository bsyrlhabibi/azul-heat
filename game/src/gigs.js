// gigs.js — repeatable side work between story missions: checkpoint
// street races, timed courier runs, and scored rampages. All pay cash
// and build reputation in the district they run in.

import { PLACES } from './config.js';
import { G, activeRunner, addFloater, addMessage } from './state.js';
import { makePed } from './pedestrians.js';
import { dist } from './random.js';
import { addCash, addRep } from './economy.js';
import { sfx } from './audio.js';

const RACE_ROUTE = [
  { x: 2670, y: 1150 }, { x: 2150, y: 1725 }, { x: 1620, y: 1150 },
  { x: 1100, y: 575 }, { x: 560, y: 1150 }, { x: 1100, y: 1725 },
];
const COURIER_SPOTS = ['pierEnd', 'contador', 'prisma', 'docksDepot', 'stripPark', 'oldtownYard', 'hospital'];

export function startRace() {
  G.gig = { kind: 'race', i: 0, t: 0, cps: RACE_ROUTE };
  addMessage('Race Radio', 'Street race started — hit every pink checkpoint.');
  sfx.pickup();
}
export function startCourier() {
  const from = COURIER_SPOTS[Math.floor(Math.random() * COURIER_SPOTS.length)];
  let to = from;
  while (to === from) to = COURIER_SPOTS[Math.floor(Math.random() * COURIER_SPOTS.length)];
  const a = PLACES[from], b = PLACES[to];
  const limit = Math.max(55, Math.round(dist(a.x, a.y, b.x, b.y) / 10));
  G.gig = { kind: 'courier', phase: 'pickup', x: a.x, y: a.y, tx: b.x, ty: b.y, tLeft: limit };
  addMessage('Courier Board', `Package at ${a.label}. Clock is running.`);
  sfx.pickup();
}
export function startRampage(x, y) {
  for (let i = 0; i < 5; i++) {
    const e = makePed(x + Math.cos(i * 1.7) * 120, y + Math.sin(i * 1.7) * 120, {});
    e.hostile = true; e.tag = 'rampage'; e.hp = 100; e.speed = 102; e.top = '#4a2f35';
    G.enemies.push(e);
  }
  G.gig = { kind: 'rampage', x, y, tLeft: 75, score: 0, need: 6, counted: new Set() };
  addMessage('Word on the Street', 'Rampage! Wreck rides and drop guards — score 6 before the clock dies.');
  sfx.pickup();
}

function endGig(payout, districtName, text) {
  const r = activeRunner();
  if (payout > 0) addCash(payout, r.x, r.y);
  if (districtName) addRep(districtName, 8);
  addMessage('Gig Done', text);
  G.gig = null; G.marker = null; G.objective = '';
  sfx.complete();
}
function failGig(text) {
  addMessage('Gig Failed', text);
  G.gig = null; G.marker = null; G.objective = '';
  sfx.fail();
}

export function updateGigs(dt) {
  const gig = G.gig;
  if (!gig) return;
  const r = activeRunner();
  if (gig.kind === 'race') {
    gig.t += dt;
    const cp = gig.cps[gig.i];
    G.marker = { x: cp.x, y: cp.y, color: '#ff70a6' };
    G.objective = `Street race — checkpoint ${gig.i + 1}/${gig.cps.length} · ${gig.t.toFixed(1)}s`;
    if (r.car && dist(r.x, r.y, cp.x, cp.y) < 74) {
      sfx.pickup();
      gig.i++;
      if (gig.i >= gig.cps.length) {
        const payout = gig.t < 130 ? 600 : gig.t < 190 ? 420 : 260;
        endGig(payout, 'Neon Strip', `Race finished in ${gig.t.toFixed(1)}s — $${payout}.`);
      }
    }
  } else if (gig.kind === 'courier') {
    gig.tLeft -= dt;
    const tx = gig.phase === 'pickup' ? gig.x : gig.tx, ty = gig.phase === 'pickup' ? gig.y : gig.ty;
    G.marker = { x: tx, y: ty, color: '#7bf1a8' };
    G.objective = `${gig.phase === 'pickup' ? 'Collect the package' : 'Deliver the package'} — ${Math.max(0, Math.ceil(gig.tLeft))}s`;
    if (gig.tLeft <= 0) { failGig('Too slow — the package went to someone else.'); return; }
    if (dist(r.x, r.y, tx, ty) < 52) {
      if (gig.phase === 'pickup') { gig.phase = 'deliver'; sfx.pickup(); addFloater(r.x, r.y - 26, 'PACKAGE ON BOARD', '#7bf1a8'); }
      else endGig(320 + Math.round(gig.tLeft), null, 'Courier run delivered with time to spare.');
    }
  } else if (gig.kind === 'rampage') {
    gig.tLeft -= dt;
    let score = 0;
    for (const e of G.enemies) if (e.tag === 'rampage' && e.down) score++;
    for (const c of G.cars) {
      if (c.dead && dist(c.x, c.y, gig.x, gig.y) < 320) { if (!gig.counted.has(c.id)) gig.counted.add(c.id); }
    }
    score += gig.counted.size;
    gig.score = score;
    G.objective = `RAMPAGE — score ${score}/${gig.need} · ${Math.max(0, Math.ceil(gig.tLeft))}s`;
    G.marker = null;
    if (gig.tLeft <= 0) {
      G.enemies = G.enemies.filter((e) => e.tag !== 'rampage' || e.down);
      if (score >= gig.need) endGig(350 + score * 45, 'The Docks', `Rampage complete — score ${score}. The street talks.`);
      else failGig(`Rampage fizzled at score ${score}.`);
    }
  }
}
