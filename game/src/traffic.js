// traffic.js — fills the streets: parked cars in the lots world.js marked,
// and ambient traffic that follows lanes, turns at junctions and brakes
// for whatever is in front of it.

import { ROADS_V, ROADS_H, WORLD_W, WORLD_H, MODEL_KEYS } from './config.js';
import { G, activeRunner } from './state.js';
import { W } from './world.js';
import { makeCar, stepCar, carSpeed } from './vehicles.js';
import { makeRng, pick, randRange, clamp, angleDelta, dist } from './random.js';

let rng = makeRng(99);
const TRAFFIC_COLORS = ['#adb5bd', '#588157', '#7f5539', '#4a6fa5', '#e9ecef', '#bc6c25', '#ffd60a', '#e63946'];
function newWaypoint(car) {
  const ai = car.ai;
  const junctions = ai.axis === 'v' ? ROADS_H : ROADS_V;
  const pos = ai.axis === 'v' ? car.y : car.x;
  const ahead = junctions.filter((j) => (j - pos) * ai.dir > 60);
  const limit = ai.axis === 'v' ? WORLD_H : WORLD_W;
  const target = ahead.length ? pick(rng, ahead) : (ai.dir > 0 ? limit - 80 : 80);
  ai.wp = ai.axis === 'v' ? { x: car.x, y: target } : { x: target, y: car.y };
  ai.turnAt = ahead.length ? target : null;
}
function spawnTrafficCar(x, y) {
  const axis = rng() < 0.5 ? 'v' : 'h';
  const line = axis === 'v' ? pick(rng, ROADS_V) : pick(rng, ROADS_H);
  const dir = rng() < 0.5 ? 1 : -1;
  const off = (axis === 'v' ? -dir : dir) * 24;
  const px = axis === 'v' ? line + off : x, py = axis === 'v' ? y : line + off;
  const model = pick(rng, MODEL_KEYS);
  const car = makeCar(model, px, py, axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), {
    color: pick(rng, TRAFFIC_COLORS), driver: 'traffic',
  });
  car.ai = { axis, dir, cruise: randRange(rng, 78, 122), wp: null, turnAt: null };
  newWaypoint(car);
  return car;
}

export function initTraffic(seed) {
  rng = makeRng(seed * 31 + 7);
  for (const spot of W.parkingSpots) {
    if (rng() < 0.42) continue;
    const model = pick(rng, MODEL_KEYS);
    const car = makeCar(model, spot.x, spot.y, spot.angle + (rng() < 0.5 ? 0 : Math.PI), { parked: true });
    car.color = pick(rng, car.def.colors);
    G.cars.push(car);
  }
  for (let i = 0; i < 15; i++)
    G.cars.push(spawnTrafficCar(randRange(rng, 400, WORLD_W - 200), randRange(rng, 200, WORLD_H - 200)));
}

function obstacleAhead(car) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  let nearest = 999;
  const test = (o, r) => {
    const dx = o.x - car.x, dy = o.y - car.y;
    const fwd = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (fwd > 0 && fwd < 95 && lat < r && fwd < nearest) nearest = fwd;
  };
  for (const o of G.cars) if (o !== car && !o.dead) test(o, 24);
  for (const p of G.peds) test(p, 15);
  const r = activeRunner();
  if (!r.car) test(r, 15);
  return nearest;
}

export function updateTraffic(dt) {
  const player = activeRunner();
  for (const car of G.cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    const ai = car.ai;
    // Recycle cars that drift too far from the action.
    if (dist(car.x, car.y, player.x, player.y) > 1750) {
      const fresh = spawnTrafficCar(player.x + randRange(rng, -1200, 1200), player.y + randRange(rng, -1200, 1200));
      car.x = fresh.x; car.y = fresh.y; car.angle = fresh.angle; car.ai = fresh.ai; car.vx = car.vy = 0;
      continue;
    }
    const wp = ai.wp;
    const d = dist(car.x, car.y, wp.x, wp.y);
    if (d < 46) {
      // At a junction: sometimes turn onto the crossing road.
      if (ai.turnAt !== null && rng() < 0.42) {
        ai.axis = ai.axis === 'v' ? 'h' : 'v';
        ai.dir = rng() < 0.5 ? 1 : -1;
      }
      newWaypoint(car);
    }
    // Settle into the correct lane for the current road.
    if (ai.axis === 'v') {
      const line = ROADS_V.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a);
      ai.wp.x = line + (-ai.dir) * 24;
    } else {
      const line = ROADS_H.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a);
      ai.wp.y = line + ai.dir * 24;
    }
    const desired = Math.atan2(ai.wp.y - car.y, ai.wp.x - car.x);
    const steer = clamp(angleDelta(car.angle, desired) * 2.4, -1, 1);
    const spd = carSpeed(car);
    const obs = obstacleAhead(car);
    let throttle = spd < ai.cruise ? 0.65 : 0;
    if (obs < 42) throttle = -0.7; else if (obs < 95) throttle = Math.min(throttle, 0.02);
    stepCar(car, dt, { throttle, steer, handbrake: false });
    // A badly smashed traffic car stops and its driver bails out on foot.
    if (car.hp < car.maxHp * 0.35) {
      car.driver = null; car.parked = true;
      G.peds.push({ x: car.x + 20, y: car.y + 14, angle: car.angle, walk: 0, flee: 3.5, speed: 120, skin: '#9a6a42', top: '#5b8e7d', bottom: '#33383f', hair: '#201812', panic: true });
    }
  }
}
