// combat.js — fists and the pistol: mouse-aimed attacks, tracers, hit
// resolution against thugs, pedestrians and cars, plus the hostile-thug
// AI and the shared particle/tracer updater.

import { G, activeRunner, addFloater } from './state.js';
import { mouse } from './input.js';
import { collideCircle } from './world.js';
import { damageCar } from './vehicles.js';
import { clamp, dist, angleTo } from './random.js';
import { reportCrime } from './police.js';
import { panicNear } from './pedestrians.js';
import { hurtRunner } from './characters.js';
import { sfx } from './audio.js';

let fireCd = 0, punchCd = 0;

function nearestAlongRay(ox, oy, angle, range, targets) {
  const fx = Math.cos(angle), fy = Math.sin(angle);
  let best = null, bestD = range;
  for (const t of targets) {
    if (t.down || t.dead) continue;
    const dx = t.x - ox, dy = t.y - oy;
    const fwd = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (fwd > 6 && fwd < bestD && lat < 13) { best = t; bestD = fwd; }
  }
  return best;
}

function hurtPerson(p, dmg, angle) {
  p.hp -= dmg;
  p.x += Math.cos(angle) * 7; p.y += Math.sin(angle) * 7;
  if (p.hp <= 0 && !p.down) {
    p.down = true; p.fade = 1;
    addFloater(p.x, p.y - 20, 'DOWN', '#ff5d5d');
    if (p.hostile) G.stats.thugsDown = (G.stats.thugsDown || 0) + 1;
  } else if (!p.hostile) { p.flee = 3; p.fleeFrom = { x: G.mouse.wx, y: G.mouse.wy }; }
}

export function updateCombat(dt) {
  fireCd -= dt; punchCd -= dt;
  const r = activeRunner();
  if (G.screen === 'play' && !r.car && mouse.down) {
    const a = angleTo(r.x, r.y, G.mouse.wx, G.mouse.wy);
    r.angle = a;
    // Punch whatever is close in front; otherwise fire the pistol.
    const close = nearestAlongRay(r.x, r.y, a, 34, [...G.enemies, ...G.peds]);
    if (close && punchCd <= 0) {
      punchCd = 0.28;
      sfx.punch();
      hurtPerson(close, 46, a);
      if (!close.hostile) reportCrime('assault', r.x, r.y);
      panicNear(r.x, r.y, 130);
    } else if (!close && fireCd <= 0) {
      if (r.ammo > 0) {
        fireCd = 0.17; r.ammo--; G.stats.shots++;
        sfx.shot();
        const targets = [...G.enemies, ...G.peds];
        const hit = nearestAlongRay(r.x, r.y, a, 540, targets);
        const carHit = nearestAlongRay(r.x, r.y, a, 540, G.cars);
        let endD = 540;
        if (hit) endD = Math.min(endD, dist(r.x, r.y, hit.x, hit.y));
        if (carHit) endD = Math.min(endD, dist(r.x, r.y, carHit.x, carHit.y));
        G.tracers.push({ x: r.x + Math.cos(a) * 14, y: r.y + Math.sin(a) * 14, x2: r.x + Math.cos(a) * endD, y2: r.y + Math.sin(a) * endD, t: 0 });
        if (hit && (!carHit || dist(r.x, r.y, hit.x, hit.y) <= dist(r.x, r.y, carHit.x, carHit.y))) {
          hurtPerson(hit, 58, a);
          if (!hit.hostile) reportCrime(hit.down ? 'murder' : 'assault', r.x, r.y);
        } else if (carHit) damageCar(carHit, 9);
        for (let i = 0; i < 3; i++) G.particles.push({ kind: 'spark', x: r.x + Math.cos(a) * 16, y: r.y - 6 + (Math.random() - 0.5) * 4, vx: Math.cos(a) * 60 + (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0, life: 0.16 });
        reportCrime('shoot', r.x, r.y);
        panicNear(r.x, r.y, 300);
      } else if (fireCd <= 0) { fireCd = 0.3; addFloater(r.x, r.y - 26, 'NO AMMO', '#ff5d5d'); }
    }
  }
  // Hostile thugs close in and swing; against a driver they beat on the car.
  for (const e of G.enemies) {
    if (e.down || !e.hostile) continue;
    const d = dist(e.x, e.y, r.x, r.y);
    e.atkCd = (e.atkCd || 0) - dt;
    if (d > 26) {
      const a = angleTo(e.x, e.y, r.x, r.y);
      e.angle = a;
      const res = collideCircle(e.x + Math.cos(a) * 104 * dt, e.y + Math.sin(a) * 104 * dt, 8);
      e.x = res.x; e.y = res.y; e.walk += dt * 9;
    } else if (e.atkCd <= 0) {
      e.atkCd = 0.85;
      sfx.punch();
      if (r.car) damageCar(r.car, 5); else hurtRunner(7, e.x, e.y);
    }
  }
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.down) { e.fade = (e.fade ?? 1) - dt * 0.3; if (e.fade <= 0) G.enemies.splice(i, 1); }
  }
}

// Sparks, smoke, fire and tracers all age out here.
export function updateFx(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'smoke' || p.kind === 'fire') p.vy -= 12 * dt;
    if (p.t >= p.life) G.particles.splice(i, 1);
  }
  for (let i = G.tracers.length - 1; i >= 0; i--) { G.tracers[i].t += dt * 6; if (G.tracers[i].t >= 1) G.tracers.splice(i, 1); }
  for (let i = G.floaters.length - 1; i >= 0; i--) { const f = G.floaters[i]; f.t += dt; f.y -= 22 * dt; if (f.t > 1.4) G.floaters.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt * 14);
}
