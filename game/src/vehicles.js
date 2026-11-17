// vehicles.js — car factory, arcade driving physics (with handbrake drift),
// collision damage, smoke, and the top-down car renderer with dusk lights.

import { CAR_MODELS } from './config.js';
import { G } from './state.js';
import { collideCircle } from './world.js';
import { clamp } from './random.js';
import { sfx } from './audio.js';

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((n & 255) * f), 0, 255);
  return `rgb(${r},${g},${b})`;
}

let carSeq = 1;
export function makeCar(model, x, y, angle, opts = {}) {
  const def = CAR_MODELS[model];
  return {
    id: carSeq++, model, def, x, y, angle,
    vx: 0, vy: 0, steerVis: 0,
    color: opts.color || def.colors[0],
    hp: def.hp, maxHp: def.hp,
    police: !!opts.police, parked: !!opts.parked,
    driver: opts.driver || null, ai: opts.ai || null,
    missionCar: false, smokeT: 0, dead: false,
  };
}

export function carSpeed(car) { return Math.hypot(car.vx, car.vy); }
export function forwardSpeed(car) { return car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle); }

// One physics step. ctl: { throttle -1..1, steer -1..1, handbrake bool }.
// Returns impact speed if the car slammed something this step, else 0.
export function stepCar(car, dt, ctl, handling = 1, durability = 1) {
  const def = car.def;
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  let fSpd = car.vx * fx + car.vy * fy;
  const latX = car.vx - fx * fSpd, latY = car.vy - fy * fSpd;
  if (ctl.throttle > 0) fSpd += def.accel * ctl.throttle * dt;
  else if (ctl.throttle < 0) fSpd += (fSpd > 8 ? -420 : -def.accel * 0.55) * -ctl.throttle * dt;
  fSpd -= fSpd * (ctl.handbrake ? 1.4 : 0.55) * dt;                 // drag / brake scrub
  fSpd = clamp(fSpd, -def.top * 0.38, def.top);
  const gripKeep = ctl.handbrake ? Math.pow(0.06, dt) : Math.pow(0.0001, dt) * def.grip + Math.pow(0.25, dt) * (1 - def.grip);
  const turnAuthority = clamp(Math.abs(fSpd) / 60, 0, 1) * (fSpd < 0 ? -1 : 1);
  car.angle += ctl.steer * 2.05 * handling * turnAuthority * dt * clamp(Math.abs(fSpd) / def.top + 0.35, 0.35, 1);
  car.steerVis = ctl.steer;
  const nfx = Math.cos(car.angle), nfy = Math.sin(car.angle);
  car.vx = nfx * fSpd + latX * gripKeep;
  car.vy = nfy * fSpd + latY * gripKeep;
  const px = car.x, py = car.y;
  car.x += car.vx * dt; car.y += car.vy * dt;
  const res = collideCircle(car.x, car.y, def.w * 0.40);
  car.x = res.x; car.y = res.y;
  let impact = 0;
  if (res.hit) {
    const before = Math.hypot(car.vx, car.vy);
    // Kill the velocity component that pushed into the solid.
    const pushX = car.x - px - car.vx * dt, pushY = car.y - py - car.vy * dt;
    if (Math.abs(pushX) > 0.01) car.vx *= -0.25;
    if (Math.abs(pushY) > 0.01) car.vy *= -0.25;
    const after = Math.hypot(car.vx, car.vy);
    impact = Math.max(0, before - after);
    if (impact > 55) damageCar(car, impact * 0.22 * durability);
  }
  // Car-to-car: soft push apart, damage on hard contact.
  for (const o of G.cars) {
    if (o === car || o.dead) continue;
    const dx = car.x - o.x, dy = car.y - o.y, rr = (def.w + o.def.w) * 0.36;
    const d2 = dx * dx + dy * dy;
    if (d2 > rr * rr || d2 < 0.01) continue;
    const d = Math.sqrt(d2), push = (rr - d) / 2, ux = dx / d, uy = dy / d;
    car.x += ux * push; car.y += uy * push; o.x -= ux * push; o.y -= uy * push;
    const rel = Math.abs(car.vx - o.vx) + Math.abs(car.vy - o.vy);
    if (rel > 130) { damageCar(car, rel * 0.10 * durability); damageCar(o, rel * 0.10); impact = Math.max(impact, rel * 0.6); }
    car.vx += ux * 14; car.vy += uy * 14; o.vx -= ux * 14; o.vy -= uy * 14;
  }
  if (impact > 90) { sfx.crash(Math.min(1, impact / 220)); G.shake = Math.min(9, impact / 26); }
  else if (impact > 45) sfx.crash(0.4);
  return impact;
}

export function damageCar(car, amount) {
  if (car.dead) return;
  car.hp -= amount;
  if (car.hp <= 0) {
    car.hp = 0; car.dead = true;
    for (let i = 0; i < 14; i++) G.particles.push({ kind: 'spark', x: car.x, y: car.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, t: 0, life: 0.7 });
    sfx.crash(1);
  }
}

// Smoke and fire for wrecked rides; called once per frame for all cars.
export function updateCarFx(dt) {
  for (const car of G.cars) {
    if (car.hp > car.maxHp * 0.45 && !car.dead) continue;
    car.smokeT -= dt;
    if (car.smokeT <= 0) {
      car.smokeT = car.dead ? 0.1 : 0.22;
      G.particles.push({ kind: car.dead ? 'fire' : 'smoke', x: car.x + (Math.random() - 0.5) * 16, y: car.y - 4, vx: (Math.random() - 0.5) * 12, vy: -34 - Math.random() * 22, t: 0, life: rand1(0.8, 1.5) });
    }
  }
}
function rand1(a, b) { return a + Math.random() * (b - a); }

export function drawCar(ctx, car) {
  const { w, h } = car.def;
  ctx.save();
  ctx.translate(car.x, car.y);
  // Long golden-hour shadow, cast to the south-east.
  ctx.fillStyle = 'rgba(46,16,44,0.30)';
  ctx.beginPath(); ctx.ellipse(13, 10, w * 0.56, h * 0.62, car.angle, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(car.angle);
  const dmg = 1 - car.hp / car.maxHp;
  // Headlight glow pools ahead (dusk).
  const grad = ctx.createRadialGradient(w * 0.7, 0, 4, w * 0.95, 0, 62);
  grad.addColorStop(0, 'rgba(255,214,140,0.20)'); grad.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = grad; ctx.fillRect(w * 0.4, -30, 90, 60);
  // Body.
  ctx.fillStyle = car.police ? '#eef1f4' : shade(car.color, 0.92);
  roundRect(ctx, -w / 2, -h / 2, w, h, 7); ctx.fill();
  ctx.fillStyle = car.police ? '#23272e' : shade(car.color, 1.14);
  roundRect(ctx, -w * 0.16, -h / 2 + 2.5, w * 0.52, h - 5, 5); ctx.fill();   // cabin/roof band
  ctx.fillStyle = 'rgba(16,24,38,0.88)';                                       // glass
  roundRect(ctx, -w * 0.10, -h / 2 + 4.5, w * 0.15, h - 9, 3); ctx.fill();
  roundRect(ctx, w * 0.16, -h / 2 + 4.5, w * 0.11, h - 9, 3); ctx.fill();
  if (car.police) {
    ctx.fillStyle = '#23272e'; ctx.fillRect(-w / 2, -3, w, 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('POLICÍA', 0, 2.5);
    const flash = Math.sin(G.time * 11 + car.id) > 0;
    ctx.fillStyle = flash ? '#ff2e4d' : '#5a0f1c'; ctx.fillRect(-7, -h / 2 - 2.5, 6, 3.4);
    ctx.fillStyle = flash ? '#3d6bff' : '#12224d'; ctx.fillRect(1, -h / 2 - 2.5, 6, 3.4);
  }
  // Wheels.
  ctx.fillStyle = '#14161a';
  for (const [wx, wy] of [[-w * 0.32, -h / 2 - 1.5], [w * 0.30, -h / 2 - 1.5], [-w * 0.32, h / 2 - 1.5], [w * 0.30, h / 2 - 1.5]])
    ctx.fillRect(wx - 5, wy - 0.5, 10, 3.4);
  // Lights.
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(w / 2 - 2.5, -h / 2 + 3, 2.6, 4.4); ctx.fillRect(w / 2 - 2.5, h / 2 - 7.4, 2.6, 4.4);
  ctx.fillStyle = '#ff3049'; ctx.fillRect(-w / 2 - 0.2, -h / 2 + 3, 2.4, 4.4); ctx.fillRect(-w / 2 - 0.2, h / 2 - 7.4, 2.4, 4.4);
  if (dmg > 0.25) { ctx.fillStyle = `rgba(20,16,14,${0.25 + dmg * 0.4})`; roundRect(ctx, -w * 0.3, -h * 0.3, w * 0.34, h * 0.5, 6); ctx.fill(); }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
