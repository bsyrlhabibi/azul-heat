// Azul Heat — traffic.js: the city's moving traffic. Cars follow the road grid lane
// by lane — right-hand lanes on every street — choosing straight or turn at each
// intersection, braking for the car ahead. Parked cars from the world's lots are
// placed here too; any of them can be taken.

import { ROADS_X, ROADS_Y, ROAD_W, CAR_MODELS, CAR_COLORS } from './config.js';
import { G } from './state.js';
import { createCar, updateCar } from './vehicles.js';
import { makeRng } from './random.js';

const LANE = 28;
const rng = makeRng(4242);

/** Fill the world with parked cars and the first wave of traffic. */
export function populateCars() {
  for (const p of G.world.parked) {
    const car = createCar(rng.pick(CAR_MODELS).id, rng.pick(CAR_COLORS), p.x, p.y, p.angle, 'parked');
    G.cars.push(car);
  }
  // A few cars parked along street edges, and the safehouse's starter car.
  for (let i = 0; i < 16; i++) {
    const vertical = rng.chance(0.5);
    const cx = rng.pick(ROADS_X), cy = rng.pick(ROADS_Y);
    const x = vertical ? cx + (rng.chance(0.5) ? -1 : 1) * (ROAD_W / 2 + 16) : rng.range(80, 2900);
    const y = vertical ? rng.range(80, 2400) : cy + (rng.chance(0.5) ? -1 : 1) * (ROAD_W / 2 + 16);
    const car = createCar(rng.pick(CAR_MODELS).id, rng.pick(CAR_COLORS), x, y, vertical ? Math.PI / 2 : 0, 'parked');
    G.cars.push(car);
  }
  for (let i = 0; i < 12; i++) spawnTraffic(true);
}

function laneTarget(car) {
  // Next intersection along the car's current heading, offset into its lane.
  const a = car.angle;
  const dirx = Math.round(Math.cos(a)), diry = Math.round(Math.sin(a));
  let best = null, bestD = Infinity;
  for (const ix of ROADS_X) for (const iy of ROADS_Y) {
    const dx = ix - car.x, dy = iy - car.y;
    if (Math.sign(dx) !== dirx && dx !== 0) continue;
    if (Math.sign(dy) !== diry && dy !== 0) continue;
    if (dirx !== 0 && Math.abs(dy) > 60) continue;
    if (diry !== 0 && Math.abs(dx) > 60) continue;
    const d = Math.hypot(dx, dy);
    if (d > 20 && d < bestD) { bestD = d; best = { x: ix, y: iy }; }
  }
  if (!best) best = { x: ROADS_X[2], y: ROADS_Y[1] };
  // Aim at the lane point just past the intersection, in the direction of travel.
  return { x: best.x + dirx * 70 - diry * 0 + (diry !== 0 ? (diry > 0 ? LANE : -LANE) : 0), y: best.y + diry * 70 + (dirx !== 0 ? (dirx > 0 ? LANE : -LANE) : 0), node: best };
}

function spawnTraffic(anywhere = false) {
  const p = G.player;
  for (let tries = 0; tries < 8; tries++) {
    const vertical = rng.chance(0.5);
    const c = vertical ? rng.pick(ROADS_X) : rng.pick(ROADS_Y);
    const along = rng.range(100, vertical ? 2400 : 3200);
    const dir = rng.chance(0.5) ? 1 : -1;
    const x = vertical ? c + dir * LANE * (vertical ? 1 : 1) : along;
    const y = vertical ? along : c + dir * LANE;
    const px = vertical ? x : x, py = vertical ? y : y;
    if (p && Math.hypot(px - p.x, py - p.y) < (anywhere ? 260 : 620)) continue;
    const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createCar(rng.pick(CAR_MODELS).id, rng.pick(CAR_COLORS), px, py, angle, 'traffic');
    car.driver = 'traffic';
    car.target = laneTarget(car);
    G.cars.push(car);
    return;
  }
}

export function updateTraffic(dt) {
  let moving = 0;
  for (const car of G.cars) {
    if (car.kind !== 'traffic' || car.driver !== 'traffic') continue;
    moving++;
    const p = G.player;
    if (p && Math.hypot(car.x - p.x, car.y - p.y) > 1500) { car.gone = true; continue; }
    if (!car.target) car.target = laneTarget(car);
    const t = car.target;
    const dist = Math.hypot(t.x - car.x, t.y - car.y);
    if (dist < 46) {
      // At the intersection: mostly straight on, sometimes a turn.
      const turn = rng();
      if (turn < 0.3) car.angle = Math.round((car.angle + Math.PI / 2) / (Math.PI / 2)) * (Math.PI / 2);
      else if (turn < 0.45) car.angle = Math.round((car.angle - Math.PI / 2) / (Math.PI / 2)) * (Math.PI / 2);
      else car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
      car.target = laneTarget(car);
    }
    const want = Math.atan2(t.y - car.y, t.x - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Brake for anything close ahead.
    let throttle = Math.abs(diff) > 1.1 ? 0.25 : 0.8;
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    for (const o of G.cars) {
      if (o === car) continue;
      const dx = o.x - car.x, dy = o.y - car.y, ahead = dx * fx + dy * fy, side = Math.abs(dx * -fy + dy * fx);
      if (ahead > 0 && ahead < 62 && side < 20) { throttle = ahead < 34 ? -0.6 : 0; break; }
    }
    updateCar(car, { throttle, steer: Math.max(-1, Math.min(1, diff * 2.4)), handbrake: false }, dt);
  }
  if (moving < 12) spawnTraffic();
  // Sweep cars that despawned far from the player.
  G.cars = G.cars.filter((c) => !c.gone);
}
