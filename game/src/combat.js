// Azul Heat — combat.js: fists and a simple pistol, resolved on foot. A click
// punches when someone is close enough to reach and otherwise fires a hitscan shot
// toward the mouse with a tracer; getting hit costs armour first, then health.

import { G } from './state.js';
import { mouse } from './input.js';
import { mouseToWorld } from './characters.js';
import { addCrime } from './police.js';
import { sfx } from './audio.js';

let attackCd = 0;

export function damagePlayer(amount, fromX, fromY) {
  const p = G.player;
  if (!p || G.screen !== 'play') return;
  const absorbed = Math.min(p.armor, amount * 0.6);
  p.armor -= absorbed;
  p.hp -= amount - absorbed;
  p.lastHurt = G.time;
  if (fromX !== undefined && !p.inCar) {
    const d = Math.hypot(p.x - fromX, p.y - fromY) || 1;
    p.x += ((p.x - fromX) / d) * 6; p.y += ((p.y - fromY) / d) * 6;
  }
  if (p.hp <= 0 && G.screen === 'play') {
    p.hp = 0;
    G.screen = 'wasted';
    G.message = 'You were wasted.';
    sfx.fail();
  }
}

function hurtPed(ped, amount, crime) {
  ped.hp -= amount;
  if (ped.hp <= 0) {
    ped.dead = true; ped.corpse = true;
    addCrime('murder');
    G.particles.push({ kind: 'cash', x: ped.x, y: ped.y - 10, vx: 12, vy: -30, life: 0.7, t: 0, size: 5 });
  } else {
    ped.flee = true;
    addCrime(crime);
  }
}

export function updateCombat(dt) {
  attackCd -= dt;
  const p = G.player;
  if (!p || p.inCar || G.screen !== 'play') return;
  // Health creeps back to half when nobody has hurt you for a while.
  if (G.time - p.lastHurt > 9 && p.hp > 0 && p.hp < 50) p.hp = Math.min(50, p.hp + dt * 3);
  if (!mouse.down || attackCd > 0) return;
  const w = mouseToWorld();
  const aim = Math.atan2(w.y - p.y, w.x - p.x);
  // Someone within reach? Punch them.
  let target = null, bestD = 46;
  for (const ped of G.peds) {
    if (ped.dead || ped.kind === 'contact') continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < bestD) { bestD = d; target = ped; }
  }
  attackCd = 0.3;
  if (target) {
    sfx.punch();
    hurtPed(target, target.kind === 'thug' ? 16 : 12, 'assault');
    return;
  }
  if (G.ammo <= 0) { sfx.click(); return; }
  G.ammo--;
  attackCd = 0.21;
  sfx.shot();
  addCrime('shots');
  const range = 640;
  let hx = p.x + Math.cos(aim) * range, hy = p.y + Math.sin(aim) * range, hit = null, hitD = range;
  for (const ped of G.peds) {
    if (ped.dead || ped.kind === 'contact') continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d > range) continue;
    const ang = Math.atan2(ped.y - p.y, ped.x - p.x);
    if (Math.abs(((ang - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.055 && d < hitD) { hit = ped; hitD = d; }
  }
  for (const car of G.cars) {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d > range || d > hitD) continue;
    const ang = Math.atan2(car.y - p.y, car.x - p.x);
    if (Math.abs(((ang - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.09) { hit = car; hitD = d; }
  }
  if (hit) { hx = p.x + Math.cos(aim) * hitD; hy = p.y + Math.sin(aim) * hitD; }
  G.bullets.push({ x1: p.x + Math.cos(aim) * 14, y1: p.y - 14 + Math.sin(aim) * 14, x2: hx, y2: hy, t: 0 });
  if (hit) {
    if (hit.kind === 'walker' || hit.kind === 'thug' || hit.kind === 'contact') hurtPed(hit, 26, 'assault');
    else { hit.hp -= 6; G.particles.push({ kind: 'spark', x: hx, y: hy, vx: 0, vy: 0, life: 0.25, t: 0, size: 4 }); }
  }
}

export function updateBullets(dt) {
  for (const b of G.bullets) b.t += dt;
  G.bullets = G.bullets.filter((b) => b.t < 0.09);
}
