// Azul Heat — vehicles.js: the cars of Bahía Azul. One factory makes every car
// (traffic, parked, police, the player's), one arcade physics step drives them all —
// velocity split into forward and lateral parts so a handbrake drops the lateral
// grip and the car drifts — and one painter draws them with damage smoke and all.

import { CAR_MODELS, POLICE_COLOR } from './config.js';
import { G } from './state.js';
import { collideCircle } from './world.js';
import { sfx } from './audio.js';

let nextId = 1;

export function createCar(modelId, color, x, y, angle, kind) {
  const model = CAR_MODELS.find((m) => m.id === modelId) || CAR_MODELS[1];
  return {
    id: nextId++, model, color, x, y, angle, vx: 0, vy: 0, speed: 0,
    hp: model.hp, kind, driver: null, steerVis: 0, dead: false, honkT: 0,
  };
}

export function modelById(id) { return CAR_MODELS.find((m) => m.id === id) || CAR_MODELS[1]; }

/**
 * Advance one car. input: {throttle -1..1, steer -1..1, handbrake}. Returns the
 * impact speed if it hit something hard this step, else 0.
 */
export function updateCar(car, input, dt) {
  const m = car.model;
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const rx = -fy, ry = fx;
  let vf = car.vx * fx + car.vy * fy;
  let vl = car.vx * rx + car.vy * ry;
  const wrecked = car.hp <= 0;
  const top = wrecked ? m.speed * 0.25 : m.speed;
  if (input.throttle > 0) vf += m.accel * input.throttle * dt * (vf < 0 ? 2.2 : 1);
  else if (input.throttle < 0) vf += (vf > 12 ? -m.accel * 1.6 : m.accel * input.throttle * 0.55) * dt;
  vf -= vf * 0.55 * dt;
  vf = Math.max(-top * 0.38, Math.min(top, vf));
  vl *= Math.exp(-(input.handbrake ? 1.4 : 8.5) * dt);
  const turn = 2.7 * Math.max(-1, Math.min(1, vf / 130));
  car.angle += input.steer * turn * dt * (input.handbrake ? 1.35 : 1);
  car.steerVis = input.steer;
  const nfx = Math.cos(car.angle), nfy = Math.sin(car.angle);
  car.vx = nfx * vf + -nfy * vl;
  car.vy = nfy * vf + nfx * vl;
  car.speed = vf;
  const px = car.x, py = car.y;
  car.x += car.vx * dt; car.y += car.vy * dt;
  const fixed = collideCircle(G.world, car.x, car.y, m.l * 0.34);
  let impact = 0;
  if (fixed.x !== car.x || fixed.y !== car.y) {
    impact = Math.hypot(car.vx, car.vy);
    car.x = fixed.x; car.y = fixed.y;
    car.vx *= 0.3; car.vy *= 0.3;
    if (impact > 130) { damageCar(car, (impact - 120) * 0.09); if (car.driver === 'player') sfx.crash(); }
  }
  // Car-to-car: a soft circle push, damage only on a real hit.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const dx = car.x - other.x, dy = car.y - other.y, rr = (m.l + other.model.l) * 0.30;
    const d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2), push = (rr - d) / 2;
      car.x += (dx / d) * push; car.y += (dy / d) * push;
      other.x -= (dx / d) * push; other.y -= (dy / d) * push;
      const rel = Math.abs(car.speed - other.speed);
      if (rel > 120) { damageCar(car, rel * 0.03); damageCar(other, rel * 0.03); if (car.driver === 'player' || other.driver === 'player') sfx.crash(); }
    }
  }
  if (car.hp < 45 && Math.random() < dt * 6) {
    G.particles.push({ kind: 'smoke', x: car.x + fx * m.l * 0.3, y: car.y + fy * m.l * 0.3, vx: 0, vy: -22, life: 0.9, t: 0, size: 7 + Math.random() * 6 });
  }
  return impact;
}

export function damageCar(car, amount) {
  car.hp = Math.max(0, car.hp - amount);
  if (car.hp <= 0 && !car.dead) { car.dead = true; }
}

export function drawCar(c, car) {
  const m = car.model, L = m.l, W = m.w;
  c.save();
  c.translate(car.x, car.y);
  c.fillStyle = 'rgba(40,16,40,0.30)';
  c.beginPath(); c.ellipse(3, 6, L * 0.52, W * 0.55, car.angle, 0, Math.PI * 2); c.fill();
  c.rotate(car.angle);
  // Wheels, the front pair turned by the steering.
  c.fillStyle = '#14161c';
  for (const [wx, wy, front] of [[-L * 0.32, -W / 2, 1], [-L * 0.32, W / 2, 1], [L * 0.32, -W / 2, 0], [L * 0.32, W / 2, 0]]) {
    c.save(); c.translate(wx, wy); if (front) c.rotate(car.steerVis * 0.4);
    c.fillRect(-6, -3, 12, 6); c.restore();
  }
  const grad = c.createLinearGradient(0, -W / 2, 0, W / 2);
  grad.addColorStop(0, car.color); grad.addColorStop(0.5, car.color); grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  c.fillStyle = grad;
  c.beginPath(); c.roundRect(-L / 2, -W / 2, L, W, 9); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.20)';
  c.beginPath(); c.roundRect(-L / 2 + 3, -W / 2 + 2, L - 6, 5, 3); c.fill();
  // Cabin and glass.
  c.fillStyle = '#1d2733';
  c.beginPath(); c.roundRect(-L * 0.16, -W * 0.38, L * 0.34, W * 0.76, 6); c.fill();
  c.fillStyle = '#7fd4e8';
  c.beginPath(); c.roundRect(L * 0.10, -W * 0.34, L * 0.09, W * 0.68, 3); c.fill();
  c.beginPath(); c.roundRect(-L * 0.24, -W * 0.34, L * 0.07, W * 0.68, 3); c.fill();
  if (car.kind === 'police') {
    c.fillStyle = '#14161c';
    c.fillRect(-L * 0.05, -W / 2, L * 0.16, W);
    const flash = Math.floor(G.time * 6) % 2 === 0;
    c.fillStyle = flash ? '#ff3b30' : '#5e2b28'; c.fillRect(-4, -W * 0.30, 8, W * 0.28);
    c.fillStyle = flash ? '#2b4a6b' : '#2f7bff'; c.fillRect(-4, W * 0.03, 8, W * 0.28);
    c.fillStyle = '#14161c'; c.font = 'bold 8px system-ui'; c.textAlign = 'center';
    c.fillText('POLICÍA', 0, W * 0.72);
  }
  if (car.model.id === 'taxi') {
    c.fillStyle = '#14161c'; c.fillRect(-6, -7, 12, 14);
    c.fillStyle = '#ffd75e'; c.font = 'bold 7px system-ui'; c.textAlign = 'center'; c.fillText('TAXI', 0, 2.5);
  }
  if (car.hp < 55) { // dents
    c.fillStyle = 'rgba(20,20,20,0.35)';
    c.beginPath(); c.arc(L * 0.3, -W * 0.2, 5, 0, Math.PI * 2); c.arc(-L * 0.35, W * 0.25, 4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
