// characters.js — the two runners: on-foot movement with mouse aim, driving
// the car they are in, entering and stealing cars, and Tab-switching
// between Lucía and Marco (each keeps their own health, ammo and spot).

import { PLACES, CONTACTS } from './config.js';
import { G, activeRunner, activeDef, otherRunnerId, addFloater } from './state.js';
import { keys, pressed, mouse } from './input.js';
import { collideCircle } from './world.js';
import { stepCar, carSpeed } from './vehicles.js';
import { clamp, dist, angleTo } from './random.js';
import { reportCrime } from './police.js';
import { sfx } from './audio.js';

export function switchRunner() {
  const cur = activeRunner();
  if (cur.car) exitCar();
  G.active = otherRunnerId();
  const next = activeRunner();
  G.cam.x = next.x; G.cam.y = next.y;
  addFloater(next.x, next.y - 26, activeDef().name, '#ffd23f');
  sfx.click();
}

export function exitCar() {
  const r = activeRunner();
  const car = r.car;
  if (!car) return;
  car.driver = null; car.parked = true;
  r.car = null;
  const side = car.angle + Math.PI / 2;
  const res = collideCircle(car.x + Math.cos(side) * 30, car.y + Math.sin(side) * 30, 9);
  r.x = res.x; r.y = res.y; r.angle = car.angle;
}

export function enterCar(car) {
  const r = activeRunner();
  if (car.driver === 'traffic') {
    // Carjacking: the driver bails and runs.
    car.driver = null;
    G.peds.push({ x: car.x + 24, y: car.y + 10, angle: car.angle, walk: 0, flee: 4, fleeFrom: { x: r.x, y: r.y }, speed: 125, skin: '#9a6a42', top: '#7d8597', bottom: '#33383f', hair: '#201812', hp: 100 });
    reportCrime('carjack', car.x, car.y);
  } else if (car.police) {
    reportCrime('stealPolice', car.x, car.y);
  } else if (!car.stolen) {
    reportCrime('steal', car.x, car.y);
  }
  if (!car.stolen) { car.stolen = true; G.stats.carsStolen++; }
  car.driver = 'player'; car.parked = false;
  r.car = car;
  sfx.click();
}

export function hurtRunner(amount, fromX, fromY) {
  const r = activeRunner();
  if (G.screen !== 'play') return;
  const absorbed = Math.min(r.armor, amount * 0.7);
  r.armor -= absorbed; r.hp -= (amount - absorbed);
  G.shake = Math.min(7, G.shake + 2.5);
  if (fromX !== undefined) addFloater(r.x, r.y - 24, 'OUCH', '#ff5d5d');
  if (r.hp <= 0) { r.hp = 0; G.screen = 'wasted'; G.deadT = 0; sfx.fail(); }
}

// What the E key would do right now, for the HUD prompt and main's dispatch.
export function findInteract() {
  const r = activeRunner();
  if (r.car) {
    if (dist(r.x, r.y, PLACES.garage.x, PLACES.garage.y) < 74) return { kind: 'garageStore', label: 'E — store car in the garage' };
    if (dist(r.x, r.y, PLACES.raceStart.x, PLACES.raceStart.y) < 84 && !G.gig) return { kind: 'race', label: 'E — start the street race' };
    return { kind: 'exit', label: 'E — get out' };
  }
  for (const c of CONTACTS) {
    const p = PLACES[c.place];
    if (dist(r.x, r.y, p.x, p.y) < 58) return { kind: 'contact', contactId: c.id, label: `E — talk to ${c.name}` };
  }
  if (dist(r.x, r.y, PLACES.safehouse.x, PLACES.safehouse.y) < 66) return { kind: 'safehouse', label: 'E — safehouse: rest, save, garage' };
  for (const key of ['gunshopA', 'gunshopB']) {
    if (dist(r.x, r.y, PLACES[key].x, PLACES[key].y) < 60) return { kind: 'shop', place: key, label: 'E — Ammu-Nación: gear up' };
  }
  if (!G.gig && !G.mission && dist(r.x, r.y, PLACES.docksDepot.x, PLACES.docksDepot.y) < 62) return { kind: 'courier', label: 'E — courier board: run a package' };
  if (!G.gig && !G.mission && dist(r.x, r.y, PLACES.oldtownYard.x, PLACES.oldtownYard.y) < 62) return { kind: 'rampage', label: 'E — start a rampage here' };
  let best = null, bd = 50;
  for (const car of G.cars) {
    if (car.dead || car.driver === 'player') continue;
    const d = dist(r.x, r.y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  if (best) return { kind: 'car', car: best, label: best.driver === 'traffic' ? `E — steal the ${best.def.name}` : `E — drive the ${best.def.name}` };
  return null;
}

export function updateRunner(dt) {
  const r = activeRunner();
  const def = activeDef();
  if (pressed('Tab')) { switchRunner(); return; }
  if (r.car) {
    const car = r.car;
    if (car.dead) { exitCar(); addFloater(r.x, r.y - 30, 'WRECKED!', '#ff5d5d'); return; }
    r.x = car.x; r.y = car.y; r.angle = car.angle;
    const ctl = {
      throttle: (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -1 : 0),
      steer: (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0),
      handbrake: !!keys.Space,
    };
    stepCar(car, dt, ctl, def.handling, def.durability);
    if (pressed('KeyH')) sfx.horn();
    for (const [code, st] of [['Digit1', 1], ['Digit2', 2], ['Digit3', 3], ['Digit0', 0]])
      if (pressed(code)) { G.radio = st; if (st) addFloater(r.x, r.y - 30, '♪ radio on', '#7bf1a8'); }
    r.walk += carSpeed(car) * dt * 0.05;
    return;
  }
  // On foot.
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my); mx /= len; my /= len;
    const spd = 148 * def.footSpeed * ((keys.ShiftLeft || keys.ShiftRight) ? 1.45 : 1);
    const res = collideCircle(r.x + mx * spd * dt, r.y + my * spd * dt, 9);
    r.x = res.x; r.y = res.y;
    r.walk += dt * spd * 0.075;
    if (!mouse.down) r.angle = Math.atan2(my, mx);
  }
  if (mouse.down || keys.KeyF) r.angle = angleTo(r.x, r.y, G.mouse.wx, G.mouse.wy);
  r.angle = clamp(r.angle, -Math.PI * 2, Math.PI * 2);
}
