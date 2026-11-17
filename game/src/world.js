// Azul Heat — world.js: builds Bahía Azul from a seed and answers questions about it.
// A grid of roads cuts the city into blocks; each block grows buildings in its
// district's style (Old Town blocks, Marina palms, Neon Strip signs, Dock warehouses),
// with parking lots and parks mixed in. Everything solid is a rectangle or a circle,
// so collision is one closest-point push per obstacle.

import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, BEACH_X, WATER_X, DISTRICTS } from './config.js';
import { makeRng } from './random.js';

const WALLS = {
  oldtown: ['#d9a066', '#c98d5f', '#e0b184', '#b87f56'],
  midtown: ['#cfd6da', '#b9c6cf', '#e3d9c8', '#a8bcc9'],
  marina: ['#f2e6cf', '#e8d3ae', '#dfe9e4', '#f5efe0'],
  strip: ['#8e6bbf', '#c65d9e', '#5d7fc9', '#d98cb3'],
  hills: ['#e8dcc0', '#dcc7a0', '#efe6cc', '#d3bd93'],
  docks: ['#9aa0a4', '#8b9299', '#a89a86', '#7f8c94'],
};
const NEON_SIGNS = ['CAFÉ SOL', 'HOTEL AZUL', 'CLUB PRISMA', 'CINE OLA', 'BAR TROPICO', 'DISCO MAR', 'RAMEN REY', 'CASINO PERLA'];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[2];
}

export function buildWorld(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const world = {
    buildings: [], trees: [], parked: [], signs: [],
    gunShops: [{ x: 1130, y: 905, name: 'Armas del Sol' }, { x: 2330, y: 1610, name: 'Puerto Arms' }],
    safehouse: { x: 180, y: 1820, garage: { x: 90, y: 1900, w: 180, h: 110 } },
    hospital: { x: 1300, y: 330 },
    spawns: { lucia: { x: 2260, y: 700 }, marco: { x: 1540, y: 1960 } },
  };
  const xs = [0, ...ROADS_X.flatMap((c) => [c - ROAD_W / 2, c + ROAD_W / 2]), BEACH_X];
  const ys = [0, ...ROADS_Y.flatMap((c) => [c - ROAD_W / 2, c + ROAD_W / 2]), WORLD_H];
  // Three open plazas where the story contacts hold court — kept building-free.
  const plazas = [[2160, 480], [480, 480], [1600, 1040], [0, 1600]];
  for (let i = 0; i < xs.length - 1; i += 2) {
    for (let j = 0; j < ys.length - 1; j += 2) {
      const bx = xs[i], by = ys[j], bw = xs[i + 1] - bx, bh = ys[j + 1] - by;
      if (bw < 80 || bh < 80) continue;
      if (plazas.some(([px, py]) => px === bx && py === by)) {
        for (let t = 0; t < 4; t++) world.trees.push({ x: bx + rng.range(40, bw - 40), y: by + rng.range(40, bh - 40), r: 9 });
        world.parked.push({ x: bx + 60, y: by + 70, angle: 0 }, { x: bx + bw - 70, y: by + bh - 60, angle: Math.PI });
        continue;
      }
      growBlock(world, rng, bx + 16, by + 16, bw - 32, bh - 32, districtAt(bx + bw / 2, by + bh / 2));
    }
  }
  // Palms along the beach and the Marina promenade.
  for (let y = 60; y < WORLD_H - 40; y += 90) {
    world.trees.push({ x: BEACH_X + rng.range(24, 90), y: y + rng.range(-16, 16), r: 9 });
  }
  return world;
}

function growBlock(world, rng, x, y, w, h, district) {
  const roll = rng();
  if (district.id === 'hills' && roll < 0.3) { // a Palm Hills park
    for (let i = 0; i < 6; i++) world.trees.push({ x: x + rng.range(14, w - 14), y: y + rng.range(14, h - 14), r: 9 });
    return;
  }
  if (roll < 0.13) { // a parking lot: rows of parked cars anyone may take
    const n = rng.int(2, 5);
    for (let i = 0; i < n; i++) {
      world.parked.push({ x: x + 30 + (i % 3) * 52, y: y + 34 + Math.floor(i / 3) * 74, angle: Math.PI / 2 });
    }
    return;
  }
  const walls = WALLS[district.id];
  if (district.id === 'docks') {
    const bw = w * rng.range(0.55, 0.8), bh = h * rng.range(0.4, 0.6);
    world.buildings.push(mkBuilding(x + rng.range(0, w - bw), y + rng.range(0, h - bh), bw, bh, rng.range(15, 24), rng.pick(walls)));
    for (let i = 0; i < 3; i++) { // container stacks
      world.buildings.push(mkBuilding(x + rng.range(0, w - 62), y + rng.range(0, h - 30), 62, 26, 13, rng.pick(['#c0392b', '#2471a3', '#229954', '#b7950b'])));
    }
    return;
  }
  const cols = w > 300 ? 2 : 1, rows = h > 300 ? 2 : 1;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const cw = w / cols, ch = h / rows;
      const bw = cw * rng.range(0.62, 0.86), bh = ch * rng.range(0.62, 0.86);
      const bx = x + cx * cw + (cw - bw) / 2, by = y + cy * ch + (ch - bh) / 2;
      const tall = district.id === 'midtown' ? rng.range(42, 82) : district.id === 'hills' ? rng.range(13, 22) : rng.range(24, 58);
      const b = mkBuilding(bx, by, bw, bh, tall, rng.pick(walls));
      world.buildings.push(b);
      if (district.id === 'strip' && rng.chance(0.75)) {
        b.sign = rng.pick(NEON_SIGNS);
        world.signs.push(b);
      }
      if (rng.chance(0.3)) world.trees.push({ x: bx - 10, y: by + bh + 8, r: 8 });
    }
  }
}

function mkBuilding(x, y, w, d, h, color) {
  return { x, y, w, d, h, color, roof: shade(color, 28), wall: shade(color, -30), sign: null };
}

/** Lighten (positive amt) or darken a #rrggbb colour. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function onRoad(x, y) {
  for (const c of ROADS_X) if (Math.abs(x - c) <= ROAD_W / 2) return true;
  for (const c of ROADS_Y) if (Math.abs(y - c) <= ROAD_W / 2) return true;
  return false;
}

/** Push a circle out of every building, tree and the sea; returns the fixed point. */
export function collideCircle(world, x, y, r) {
  x = Math.max(r, Math.min(WORLD_W - r, x));
  y = Math.max(r, Math.min(WORLD_H - r, y));
  if (x > WATER_X - r) x = WATER_X - r;
  for (const b of world.buildings) {
    const nx = Math.max(b.x, Math.min(b.x + b.w, x)), ny = Math.max(b.y, Math.min(b.y + b.d, y));
    let dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) { y = b.y + b.d + r; continue; }
    const d = Math.sqrt(d2); x = nx + (dx / d) * r; y = ny + (dy / d) * r;
  }
  for (const t of world.trees) {
    const dx = x - t.x, dy = y - t.y, rr = r + t.r * 0.4, d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0) { const d = Math.sqrt(d2); x = t.x + (dx / d) * rr; y = t.y + (dy / d) * rr; }
  }
  return { x, y };
}

/** True when the straight line between two points crosses no building (a sight line). */
export function lineOfSight(world, x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 24);
  for (let i = 1; i < steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps, y = y1 + ((y2 - y1) * i) / steps;
    for (const b of world.buildings) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.d) return false;
    }
  }
  return true;
}

/** A random point on a road, for traffic spawns and courier targets. */
export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) return { x: rng.pick(ROADS_X) + rng.range(-26, 26), y: rng.range(40, WORLD_H - 40) };
  return { x: rng.range(40, BEACH_X - 40), y: rng.pick(ROADS_Y) + rng.range(-26, 26) };
}
