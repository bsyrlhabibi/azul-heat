// Azul Heat — characters.js: the two runners and every human figure. Lucía Ferro
// (courier: sharper handling) and Marco Reyes (ex-mechanic: shrugs off damage) are
// drawn as upright shaded people with ground shadows — the 3/4 look — and this
// module moves the active one, on foot and behind the wheel, and swaps between them.

import { G } from './state.js';
import { keys, pressed, mouse, moveAxis } from './input.js';
import { collideCircle } from './world.js';
import { updateCar } from './vehicles.js';
import { spawnPed } from './pedestrians.js';
import { addCrime, noteCarSwap } from './police.js';
import { sfx } from './audio.js';

export const RUNNERS = {
  lucia: {
    id: 'lucia', name: 'LUCÍA FERRO', role: 'Courier — cars handle sharper',
    skin: '#b06a3b', hair: '#1c1210', shirt: '#0e7d86', shirt2: '#0a5a61', pants: '#26324a', bonus: 'handling', ponytail: true,
  },
  marco: {
    id: 'marco', name: 'MARCO REYES', role: 'Ex-mechanic — cars take less damage',
    skin: '#8a5426', hair: '#241a12', shirt: '#b5502a', shirt2: '#8f3d1f', pants: '#33302c', bonus: 'durability',
  },
};

export function makeRunner(id, x, y) {
  return { ...RUNNERS[id], x, y, angle: -Math.PI / 2, hp: 100, armor: 0, inCar: null, walk: 0, moving: false, lastHurt: -99, follow: false };
}

/** Draw any person (runner, pedestrian, contact) standing at x,y facing angle. */
export function drawPerson(c, p) {
  const bob = p.moving ? Math.sin(p.walk) * 1.6 : 0;
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = 'rgba(40,16,40,0.30)';
  c.beginPath(); c.ellipse(1, 4, 10, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.rotate(0);
  const legSwing = p.moving ? Math.sin(p.walk) * 5 : 0;
  c.fillStyle = p.pants;
  c.fillRect(-6 + legSwing * 0.4, -6, 5, 10); // legs
  c.fillRect(1 - legSwing * 0.4, -6, 5, 10);
  const grad = c.createLinearGradient(0, -22, 0, -4);
  grad.addColorStop(0, p.shirt); grad.addColorStop(1, p.shirt2);
  c.fillStyle = grad;
  c.beginPath(); c.roundRect(-8, -22 + bob * 0.3, 16, 17, 5); c.fill(); // torso
  c.fillStyle = p.skin;
  c.fillRect(-11, -19 + bob * 0.3, 4, 11); // arms
  c.fillRect(7, -19 + bob * 0.3, 4, 11);
  c.beginPath(); c.arc(0, -27 + bob * 0.3, 6.4, 0, Math.PI * 2); c.fill(); // head
  c.fillStyle = p.hair;
  c.beginPath(); c.arc(0, -28.5 + bob * 0.3, 6.4, Math.PI * 1.02, Math.PI * 1.98); c.fill();
  if (p.ponytail) { c.fillRect(3, -30 + bob * 0.3, 4, 10); }
  c.restore();
}

export function activePos() {
  const p = G.player;
  return p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: p.x, y: p.y };
}

/** Swap control to the other runner, wherever they are standing. */
export function switchRunner() {
  const cur = G.player, oth = G.other;
  if (cur.inCar) exitCar(cur);
  G.player = oth; G.other = cur;
  G.banner = { title: G.player.name, sub: G.player.role, until: G.time + 1.6 };
  sfx.click();
}

export function enterCar(p, car) {
  if (car.driver === 'traffic') {
    // Carjacking: the driver bails and runs.
    spawnPed(car.x + 14, car.y + 10, { flee: true });
    addCrime('carjack');
    sfx.crash();
  }
  car.driver = 'player';
  p.inCar = car;
  p.x = car.x; p.y = car.y;
  noteCarSwap();
}

export function exitCar(p) {
  const car = p.inCar;
  if (!car) return;
  car.driver = null;
  p.inCar = null;
  const side = car.angle + Math.PI / 2;
  const spot = collideCircle(G.world, car.x + Math.cos(side) * 26, car.y + Math.sin(side) * 26, 11);
  p.x = spot.x; p.y = spot.y;
}

/** The E key near a car: get in (stealing it if someone is driving). True if used. */
export function tryVehicleInteract() {
  const p = G.player;
  if (p.inCar) { exitCar(p); return true; }
  let best = null, bestD = 52;
  for (const car of G.cars) {
    if (car.gone) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (best) { enterCar(p, best); return true; }
  return false;
}

/** The interaction hint for cars, refreshed each frame. */
export function vehiclePrompt() {
  const p = G.player;
  if (p.inCar) return 'E — get out';
  for (const car of G.cars) {
    if (Math.hypot(car.x - p.x, car.y - p.y) < 52) {
      return car.driver === 'traffic' ? `E — steal the ${car.model.name}` : `E — drive the ${car.model.name}`;
    }
  }
  return null;
}

export function updatePlayer(dt) {
  const p = G.player;
  if (p.inCar) {
    const car = p.inCar;
    const hpBefore = car.hp;
    const steer = ((keys.a || keys.ArrowLeft ? -1 : 0) + (keys.d || keys.ArrowRight ? 1 : 0)) * (p.bonus === 'handling' ? 1.18 : 1);
    const input = {
      throttle: (keys.w || keys.ArrowUp ? 1 : 0) + (keys.s || keys.ArrowDown ? -1 : 0),
      steer, handbrake: !!keys[' '],
    };
    updateCar(car, input, dt);
    if (p.bonus === 'durability' && car.hp < hpBefore) car.hp = hpBefore - (hpBefore - car.hp) * 0.65;
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    p.moving = Math.abs(car.speed) > 20;
    if (pressed.h) sfx.horn();
    if (pressed['1']) G.radio = 1; if (pressed['2']) G.radio = 2; if (pressed['3']) G.radio = 3;
    if (pressed['0']) G.radio = 0;
    return;
  }
  const ax = moveAxis();
  const sprint = keys.Shift ? 1.55 : 1;
  const speed = 168 * sprint;
  p.moving = ax.x !== 0 || ax.y !== 0;
  if (p.moving) {
    const len = Math.hypot(ax.x, ax.y);
    const nx = p.x + (ax.x / len) * speed * dt, ny = p.y + (ax.y / len) * speed * dt;
    const fixed = collideCircle(G.world, nx, ny, 11);
    p.x = fixed.x; p.y = fixed.y;
    p.walk += dt * (sprint > 1 ? 13 : 10);
    if (!mouse.down) p.angle = Math.atan2(ax.y, ax.x);
  }
  if (mouse.down) {
    const w = mouseToWorld();
    p.angle = Math.atan2(w.y - p.y, w.x - p.x);
  }
  // Cars are solid to a walker.
  for (const car of G.cars) {
    const dx = p.x - car.x, dy = p.y - car.y, rr = car.model.l * 0.36;
    const d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2); p.x = car.x + (dx / d) * rr; p.y = car.y + (dy / d) * rr; }
  }
}

export function mouseToWorld() {
  return { x: mouse.x + G.camera.x, y: mouse.y + G.camera.y };
}

/** The inactive runner: stands about, or follows during the joint finale. */
export function updateOther(dt) {
  const o = G.other;
  if (!o || o.inCar) return;
  o.moving = false;
  if (o.follow) {
    const p = activePos();
    const d = Math.hypot(p.x - o.x, p.y - o.y);
    if (d > 64) {
      const step = 178 * dt;
      const nx = o.x + ((p.x - o.x) / d) * step, ny = o.y + ((p.y - o.y) / d) * step;
      const fixed = collideCircle(G.world, nx, ny, 11);
      o.x = fixed.x; o.y = fixed.y; o.walk += dt * 11; o.moving = true;
      o.angle = Math.atan2(p.y - o.y, p.x - o.x);
    }
  }
}
