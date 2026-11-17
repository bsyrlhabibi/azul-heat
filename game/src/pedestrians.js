// Azul Heat — pedestrians.js: the people of Bahía Azul. Walkers stroll the sidewalk
// strips along the block edges, flee from danger, and a few are thugs who swing at
// the player when a mission asks for a fight. Contacts (Tía Carmen and friends) are
// pedestrians who stand at their spot and wait to talk.

import { ROADS_X, ROADS_Y, WORLD_W, WORLD_H } from './config.js';
import { G } from './state.js';
import { makeRng } from './random.js';
import { collideCircle, onRoad } from './world.js';
import { drawPerson } from './characters.js';
import { damagePlayer } from './combat.js';

const rng = makeRng(90210);
const SKINS = ['#f2c79b', '#d99e63', '#b06a3b', '#8a5426', '#6e4423'];
const SHIRTS = ['#e67e22', '#ecf0f1', '#16a085', '#8e44ad', '#d35400', '#2980b9', '#c0392b', '#f1c40f', '#27ae60', '#fd79a8'];
let nextId = 1;

export function spawnPed(x, y, opts = {}) {
  const ped = {
    id: nextId++, x, y, angle: rng.range(0, Math.PI * 2), walk: rng.range(0, 6), moving: false,
    skin: rng.pick(SKINS), hair: rng.pick(['#1c1210', '#4a2c14', '#777', '#c9a227', '#222']),
    shirt: opts.shirt || rng.pick(SHIRTS), shirt2: opts.shirt || '#555', pants: rng.pick(['#2c3e50', '#5d4a36', '#34495e', '#1a1a2e']),
    kind: opts.kind || 'walker', // walker | contact | thug
    name: opts.name || null, flee: !!opts.flee, hp: opts.kind === 'thug' ? 45 : 20,
    tx: x, ty: y, retarget: 0, hitT: 0, dead: false,
  };
  ped.shirt2 = ped.shirt;
  G.peds.push(ped);
  return ped;
}

/** Keep a living crowd around the player: spawn on sidewalks, cull the far ones. */
export function populatePeds(dt) {
  const p = G.player;
  if (!p) return;
  G.peds = G.peds.filter((ped) => {
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (ped.dead) return d < 800; // corpses linger a while, then the city tidies up
    return ped.kind !== 'walker' || d < 1200;
  });
  const walkers = G.peds.filter((ped) => ped.kind === 'walker').length;
  if (walkers < 26 && rng.chance(dt * 6)) {
    // A sidewalk point: just inside a block edge, near the player but off-screen.
    const a = rng.range(0, Math.PI * 2), d = rng.range(430, 700);
    let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < 20 || y < 20 || x > WORLD_W - 20 || y > WORLD_H - 20) return;
    if (onRoad(x, y)) { x += 74; }
    const fixed = collideCircle(G.world, x, y, 11);
    spawnPed(fixed.x, fixed.y);
  }
}

export function updatePeds(dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    ped.moving = false;
    if (ped.hitT > 0) ped.hitT -= dt;
    if (ped.kind === 'contact') continue;
    let tx = ped.tx, ty = ped.ty, speed = 62;
    if (ped.flee) {
      const from = p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
      tx = ped.x + (ped.x - from.x); ty = ped.y + (ped.y - from.y); speed = 205;
      if (Math.hypot(ped.x - from.x, ped.y - from.y) > 420) ped.flee = false;
    } else if (ped.kind === 'thug' && p && !p.inCar) {
      tx = p.x; ty = p.y; speed = 148;
      const d = Math.hypot(p.x - ped.x, p.y - ped.y);
      if (d < 26 && ped.hitT <= 0) { ped.hitT = 0.8; damagePlayer(7, ped.x, ped.y); }
    } else {
      ped.retarget -= dt;
      if (ped.retarget <= 0 || Math.hypot(tx - ped.x, ty - ped.y) < 8) {
        ped.retarget = rng.range(3, 8);
        // Stroll along the block edge: pick a point on a nearby road's sidewalk.
        const vertical = rng.chance(0.5);
        if (vertical) { ped.tx = (rng.pick(ROADS_X) + (rng.chance(0.5) ? 74 : -74)); ped.ty = Math.max(20, Math.min(WORLD_H - 20, ped.y + rng.range(-320, 320))); }
        else { ped.tx = Math.max(20, Math.min(WORLD_W - 60, ped.x + rng.range(-320, 320))); ped.ty = (rng.pick(ROADS_Y) + (rng.chance(0.5) ? 74 : -74)); }
        tx = ped.tx; ty = ped.ty;
      }
    }
    const dx = tx - ped.x, dy = ty - ped.y, d = Math.hypot(dx, dy);
    if (d > 4) {
      const step = Math.min(d, speed * dt);
      const fixed = collideCircle(G.world, ped.x + (dx / d) * step, ped.y + (dy / d) * step, 10);
      ped.x = fixed.x; ped.y = fixed.y;
      ped.angle = Math.atan2(dy, dx); ped.walk += dt * 9; ped.moving = true;
    }
  }
}

export function drawPed(c, ped) { drawPerson(c, ped); }
