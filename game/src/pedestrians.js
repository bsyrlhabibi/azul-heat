// pedestrians.js — ambient citizens strolling the sidewalks and the beach
// promenade. They flee gunfire and crashes, and drawFigure() here is the
// shared renderer for every human in the game (runners, contacts, thugs).

import { ROADS_V, ROADS_H, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { G } from './state.js';
import { collideCircle } from './world.js';
import { makeRng, pick, randRange, clamp, dist } from './random.js';
import { roundRect } from './vehicles.js';

const SIDE = ROAD_W / 2 + 17;
const LINES_V = [...ROADS_V.map((x) => x - SIDE), ...ROADS_V.map((x) => x + SIDE), 272];
const LINES_H = [...ROADS_H.map((y) => y - SIDE), ...ROADS_H.map((y) => y + SIDE)];
const SKINS = ['#a0663a', '#7c4b26', '#c98d54', '#8a5a30', '#e0ac82', '#5e3a1e'];
const TOPS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#f4f1e6', '#2a9d8f'];
const BOTTOMS = ['#27324a', '#3a3230', '#4a4e69', '#22242c', '#5e503f'];

let rng = makeRng(5);

export function makePed(x, y, opts = {}) {
  return {
    x, y, angle: randRange(rng, 0, Math.PI * 2), walk: randRange(rng, 0, 6),
    speed: randRange(rng, 40, 62), wp: null, flee: 0, fleeFrom: null, hp: 100,
    skin: opts.skin || pick(rng, SKINS), top: opts.top || pick(rng, TOPS),
    bottom: opts.bottom || pick(rng, BOTTOMS), hair: opts.hair || pick(rng, ['#14100c', '#2b1a10', '#4a2f1a', '#e8e2d4', '#701f28']),
    panic: false, down: false,
  };
}

function newWaypoint(p) {
  if (rng() < 0.5) { const x = pick(rng, LINES_V); p.wp = { x, y: clamp(p.y + randRange(rng, -700, 700), 30, WORLD_H - 30) }; }
  else { const y = pick(rng, LINES_H); p.wp = { x: clamp(p.x + randRange(rng, -700, 700), 260, WORLD_W - 30), y }; }
}

export function initPeds(seed) {
  rng = makeRng(seed * 17 + 3);
  for (let i = 0; i < 42; i++) {
    const onV = rng() < 0.55;
    const x = onV ? pick(rng, LINES_V) : randRange(rng, 280, WORLD_W - 60);
    const y = onV ? randRange(rng, 40, WORLD_H - 40) : pick(rng, LINES_H);
    const p = makePed(x, y);
    newWaypoint(p);
    G.peds.push(p);
  }
}

export function panicNear(x, y, radius) {
  for (const p of G.peds) if (!p.down && dist(p.x, p.y, x, y) < radius) { p.flee = randRange(rng, 2, 4); p.fleeFrom = { x, y }; }
  for (const e of G.enemies) if (!e.down && dist(e.x, e.y, x, y) < radius && !e.hostile) { e.flee = 2; e.fleeFrom = { x, y }; }
}

export function updatePeds(dt) {
  for (const list of [G.peds, G.enemies]) {
    for (const p of list) {
      if (p.down) continue;
      let tx, ty, spd = p.speed;
      if (p.flee > 0 && p.fleeFrom) {
        p.flee -= dt;
        const a = Math.atan2(p.y - p.fleeFrom.y, p.x - p.fleeFrom.x);
        tx = p.x + Math.cos(a) * 90; ty = p.y + Math.sin(a) * 90; spd = 138;
      } else if (p.hostile) {
        continue; // hostile thugs are driven by combat.js
      } else {
        if (!p.wp || dist(p.x, p.y, p.wp.x, p.wp.y) < 12) newWaypoint(p);
        tx = p.wp.x; ty = p.wp.y;
      }
      const a = Math.atan2(ty - p.y, tx - p.x);
      p.angle = a;
      const res = collideCircle(p.x + Math.cos(a) * spd * dt, p.y + Math.sin(a) * spd * dt, 7);
      p.x = res.x; p.y = res.y;
      p.walk += dt * spd * 0.11;
    }
  }
  // Fallen pedestrians fade out and are replaced by fresh citizens elsewhere.
  for (let i = G.peds.length - 1; i >= 0; i--) {
    const p = G.peds[i];
    if (p.down) { p.fade = (p.fade ?? 1) - dt * 0.25; if (p.fade <= 0) { G.peds.splice(i, 1); const np = makePed(randRange(rng, 300, WORLD_W - 100), randRange(rng, 60, WORLD_H - 60)); newWaypoint(np); G.peds.push(np); } }
  }
}

// An upright little person, drawn 3/4: soft shadow, swinging legs and arms,
// shaded torso, head with hair. `s` scales the figure (runners are bigger).
export function drawFigure(ctx, x, y, angle, walk, pal, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(46,16,44,0.28)';
  ctx.beginPath(); ctx.ellipse(3.5, 3, 9 * s, 4.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(angle + Math.PI / 2);
  const sw = Math.sin(walk) * 3.4 * s;
  ctx.fillStyle = pal.bottom;
  ctx.fillRect(-4.6 * s + 0, -1 * s + Math.max(0, sw), 3.6 * s, 7.5 * s);   // legs (stride offset on y)
  ctx.fillRect(1 * s, -1 * s + Math.max(0, -sw), 3.6 * s, 7.5 * s);
  ctx.fillStyle = pal.top;
  roundRect(ctx, -6.4 * s, -10.5 * s, 12.8 * s, 11.5 * s, 4 * s); ctx.fill();
  ctx.fillStyle = pal.bottom;
  ctx.fillRect(-8.6 * s, -9.5 * s + sw * 0.5, 2.8 * s, 8 * s);              // arms
  ctx.fillRect(5.8 * s, -9.5 * s - sw * 0.5, 2.8 * s, 8 * s);
  if (pal.accent) { ctx.fillStyle = pal.accent; ctx.fillRect(-6.4 * s, -4.5 * s, 12.8 * s, 2.2 * s); }
  ctx.fillStyle = pal.skin;
  ctx.beginPath(); ctx.arc(0, -13.6 * s, 4.9 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath(); ctx.arc(0, -14.6 * s, 4.9 * s, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
}
