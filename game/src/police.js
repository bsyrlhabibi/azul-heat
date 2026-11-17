// police.js — the wanted system: crimes raise heat when witnessed, patrol
// cars hunt the player, roadblocks wait at three stars, a helicopter's
// searchlight pins the player at four, and standing still near a cop on
// foot fills the bust meter.

import { PLACES } from './config.js';
import { G, activeRunner, addFloater, addMessage } from './state.js';
import { randomRoadPoint } from './world.js';
import { makeCar, stepCar } from './vehicles.js';
import { makeRng, clamp, dist, angleDelta } from './random.js';
import { sfx } from './audio.js';

const CRIMES = { carjack: 1.3, steal: 0.8, stealPolice: 2.1, assault: 0.9, shoot: 0.45, hitCar: 0.4, hitPed: 1.6, murder: 1.9, mission: 1.0 };
let rng = makeRng(23);
let lastCarId = null, blockTimer = 6, seenPos = null;

export function stars() { return G.wanted.heat <= 0 ? 0 : Math.min(5, Math.ceil(G.wanted.heat)); }

export function reportCrime(kind, x, y) {
  const base = CRIMES[kind] || 0.5;
  let witnessed = false;
  for (const u of G.police.units) if (dist(u.x, u.y, x, y) < 680) witnessed = true;
  for (const p of G.peds) if (!p.down && dist(p.x, p.y, x, y) < 250) witnessed = true;
  const before = stars();
  G.wanted.heat = clamp(G.wanted.heat + base * (witnessed ? 1 : 0.35), 0, 5);
  G.wanted.lastCrime = G.time;
  if (stars() > before) addFloater(x, y - 34, '★'.repeat(stars()) + ' WANTED', '#ff5d5d');
}

function spawnUnit(tx, ty) {
  let x = tx, y = ty, tries = 0;
  while (tries++ < 8) {
    const p = randomRoadPoint(rng);
    const d = dist(p.x, p.y, tx, ty);
    if (d > 560 && d < 900) { x = p.x; y = p.y; break; }
    x = p.x; y = p.y;
  }
  const car = makeCar('sedan', x, y, Math.atan2(ty - y, tx - x), { police: true, driver: 'police', color: '#eef1f4' });
  car.ai = { mode: 'chase' };
  G.cars.push(car); G.police.units.push(car);
  return car;
}

function removeUnit(car) {
  car.dead = true;
  G.police.units = G.police.units.filter((u) => u !== car);
  G.cars = G.cars.filter((c) => c !== car);
}

export function clearPolice() {
  for (const u of [...G.police.units]) removeUnit(u);
  G.police.heli.active = false;
  G.wanted.heat = 0; G.wanted.bust = 0; G.wanted.unseenFor = 0;
}

export function policeNearFactor() {
  const r = activeRunner();
  let best = 0;
  for (const u of G.police.units) best = Math.max(best, 1 - dist(u.x, u.y, r.x, r.y) / 640);
  return clamp(best, 0, 1);
}

export function updatePolice(dt) {
  const r = activeRunner();
  const st = stars();
  const heli = G.police.heli;
  // Who can see the player right now?
  let seen = false;
  for (const u of G.police.units) if (dist(u.x, u.y, r.x, r.y) < 430) seen = true;
  if (heli.active && dist(heli.lightX, heli.lightY, r.x, r.y) < 125) seen = true;
  G.wanted.seen = seen;
  if (seen) { G.wanted.unseenFor = 0; seenPos = { x: r.x, y: r.y }; }
  else G.wanted.unseenFor += dt;
  // Swapping cars while unseen throws off the tail.
  const curCarId = r.car ? r.car.id : null;
  if (curCarId !== lastCarId) {
    if (lastCarId !== null && G.wanted.unseenFor > 1.2 && G.wanted.heat > 0) {
      G.wanted.heat = Math.max(0, G.wanted.heat - 0.7);
      addFloater(r.x, r.y - 30, 'Lost them…', '#7bf1a8');
    }
    lastCarId = curCarId;
  }
  if (G.wanted.unseenFor > 4 && G.wanted.heat > 0) G.wanted.heat = Math.max(0, G.wanted.heat - dt * 0.085);
  if (st === 0) { if (G.police.units.length) clearPolice(); return; }

  // Keep the pressure at stars+1 units.
  const want = Math.min(6, st + 1);
  if (G.police.units.length < want) spawnUnit(r.x, r.y);
  for (const u of [...G.police.units]) if (dist(u.x, u.y, r.x, r.y) > 1600 || u.dead) removeUnit(u);

  // Roadblocks at three stars and up: two cruisers parked across the road ahead.
  blockTimer -= dt;
  if (st >= 3 && blockTimer <= 0 && r.car) {
    blockTimer = 16;
    const ahead = 460, a = r.car.angle;
    const bx = r.x + Math.cos(a) * ahead, by = r.y + Math.sin(a) * ahead;
    for (const off of [-26, 26]) {
      const car = makeCar('sedan', bx + Math.cos(a + Math.PI / 2) * off, by + Math.sin(a + Math.PI / 2) * off, a + Math.PI / 2, { police: true, driver: 'police', color: '#eef1f4' });
      car.ai = { mode: 'block', until: G.time + 18 };
      G.cars.push(car); G.police.units.push(car);
    }
    addMessage('Scanner', 'Roadblock reported ahead of the suspect.');
  }

  for (const u of G.police.units) {
    if (u.ai.mode === 'block') {
      if (G.time > u.ai.until) u.ai.mode = 'chase';
      continue;
    }
    const target = seen || G.wanted.unseenFor < 3 ? { x: r.x, y: r.y } : (seenPos || { x: r.x, y: r.y });
    const desired = Math.atan2(target.y - u.y, target.x - u.x);
    const steer = clamp(angleDelta(u.angle, desired) * 2.6, -1, 1);
    const d = dist(u.x, u.y, target.x, target.y);
    const throttle = d > 60 ? 1 : (r.car ? 0.4 : -0.4);
    stepCar(u, dt, { throttle, steer, handbrake: false }, 1.06, 1);
  }

  // Helicopter at four stars: it orbits and drags its light over the player.
  heli.active = st >= 4;
  if (heli.active) {
    const tx = r.x + Math.cos(G.time * 0.6) * 90, ty = r.y + Math.sin(G.time * 0.6) * 90 - 30;
    heli.x += (tx - heli.x) * Math.min(1, dt * 1.6);
    heli.y += (ty - heli.y) * Math.min(1, dt * 1.6);
    heli.angle = Math.atan2(r.y - heli.y, r.x - heli.x);
    heli.lightX += (r.x - heli.lightX) * Math.min(1, dt * 2.2);
    heli.lightY += (r.y - heli.lightY) * Math.min(1, dt * 2.2);
  }

  // Bust: a runner on foot, cornered and slow, gets cuffed.
  if (!r.car && st > 0) {
    let near = false;
    for (const u of G.police.units) if (dist(u.x, u.y, r.x, r.y) < 64) near = true;
    if (near) {
      G.wanted.bust += dt / 2.4;
      if (G.wanted.bust >= 1) {
        const fine = Math.round(G.cash * 0.12);
        G.cash -= fine;
        clearPolice();
        r.x = PLACES.policeHQ.x; r.y = PLACES.policeHQ.y + 60;
        G.screen = 'busted'; G.deadT = 0;
        addMessage('Bahía PD', `Released after a $${fine} fine. Keep it clean out there.`);
        sfx.fail();
      }
    } else G.wanted.bust = Math.max(0, G.wanted.bust - dt * 0.7);
  } else G.wanted.bust = Math.max(0, G.wanted.bust - dt * 0.7);
}
