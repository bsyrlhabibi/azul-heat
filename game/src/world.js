// world.js — generates Bahía Azul from a seed: city blocks, buildings with
// rooftop detail, props (palms, lamps, crates, umbrellas), parking spots,
// and the collision queries every mover uses.

import { WORLD_W, WORLD_H, WATER_X, SAND_X, ROAD_W, ROADS_V, ROADS_H, DISTRICTS, PLACES } from './config.js';
import { makeRng, randRange, pick, clamp } from './random.js';

export const PIER = { x: 36, y: 476, w: 276, h: 88 };
export const W = { buildings: [], solids: [], props: [], parkingSpots: [], blocks: [] };

const ROOFS = {
  'The Marina': ['#e07a5f', '#f2cc8f', '#81b29a', '#e5989b', '#f4a261'],
  'Old Town': ['#b5654d', '#cb997e', '#a26769', '#ddb892', '#7f6a93'],
  'Neon Strip': ['#3a0ca3', '#5a189a', '#7209b7', '#1d3557', '#0d1b2a'],
  'Palm Hills': ['#c96f4a', '#a3b18a', '#e9c46a', '#f4a261', '#8ab4f8'],
  'Midtown': ['#936639', '#7f5539', '#6c5849', '#8a817c', '#5e503f'],
  'The Docks': ['#7d8597', '#979dac', '#5c677d', '#a26769', '#4a5759'],
};
const NEON_SIGNS = [
  ['AZUL', '#00f5d4'], ['PERLA', '#ff70a6'], ['NEON', '#fee440'], ['CASINO', '#00bbf9'],
  ['HOTEL SOL', '#f15bb5'], ['BAHÍA', '#9b5de5'], ['CLUB OLE', '#00f5d4'], ['MAR', '#fee440'],
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}
export function isRoad(x, y) {
  for (const rx of ROADS_V) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROADS_H) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function onPier(x, y) { return x >= PIER.x && x <= PIER.x + PIER.w && y >= PIER.y && y <= PIER.y + PIER.h; }

// Block rectangles between the roads (the city's buildable cells).
function blockRects() {
  const xs = [[SAND_X, ROADS_V[0] - ROAD_W / 2]];
  for (let i = 0; i < ROADS_V.length - 1; i++) xs.push([ROADS_V[i] + ROAD_W / 2, ROADS_V[i + 1] - ROAD_W / 2]);
  xs.push([ROADS_V[ROADS_V.length - 1] + ROAD_W / 2, WORLD_W]);
  const ys = [[0, ROADS_H[0] - ROAD_W / 2]];
  for (let i = 0; i < ROADS_H.length - 1; i++) ys.push([ROADS_H[i] + ROAD_W / 2, ROADS_H[i + 1] - ROAD_W / 2]);
  ys.push([ROADS_H[ROADS_H.length - 1] + ROAD_W / 2, WORLD_H]);
  const out = [];
  for (const [x0, x1] of xs) for (const [y0, y1] of ys) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  return out;
}
function blockKey(b) { return `${Math.round(b.x)},${Math.round(b.y)}`; }
// Hand-assigned block roles, keyed by their top-left corner.
const SPECIAL = {
  '235,623': 'plazaCarmen', '1148,623': 'plazaContador', '2198,623': 'plazaPrisma',
  '235,1773': 'safehouse', '608,1198': 'hospital', '1148,1198': 'civic',
  '2198,1773': 'dockShop', '2718,1773': 'depot', '2198,0': 'casino', '1668,0': 'yard',
};

function addBuilding(rng, district, x, y, w, h, opts = {}) {
  const b = {
    x, y, w, h, kind: opts.kind || 'block',
    roof: opts.roof || pick(rng, ROOFS[district.name]),
    height: opts.height ?? randRange(rng, 26, district.name === 'Neon Strip' ? 95 : 58),
    neon: opts.neon || null, awning: !!opts.awning,
    tank: rng() < 0.4, ac: randInt0(rng, 3), floors: 0,
  };
  b.floors = Math.max(1, Math.round(b.height / 17));
  W.buildings.push(b); W.solids.push(b);
  return b;
}
function randInt0(rng, n) { return Math.floor(rng() * (n + 1)); }

function fillLots(rng, district, b, lotW, lotH, opts = {}) {
  const m = 20;
  const cols = [], rows = [];
  for (let x = b.x + m; x + lotW <= b.x + b.w - 8; x += lotW + 22) cols.push(x);
  for (let y = b.y + m; y + lotH <= b.y + b.h - 8; y += lotH + 22) rows.push(y);
  for (let ix = 0; ix < cols.length; ix++) {
    for (let iy = 0; iy < rows.length; iy++) {
      const x = cols[ix], y = rows[iy];
      // Parking pockets only on perimeter lots, so a stolen car can always
      // reach a road; interior gaps become palms instead.
      const perimeter = ix === 0 || iy === 0 || ix === cols.length - 1 || iy === rows.length - 1;
      if (rng() < 0.14) {
        if (!perimeter || rng() < 0.5) W.props.push({ kind: 'palm', x: x + lotW / 2, y: y + lotH / 2, s: randRange(rng, 0.8, 1.2) });
        else for (let s = 0; s < 2; s++) W.parkingSpots.push({ x: x + 24 + s * 52, y: y + lotH / 2, angle: 0 });
        continue;
      }
      const w = lotW * randRange(rng, 0.82, 1), h = lotH * randRange(rng, 0.82, 1);
      const bd = addBuilding(rng, district, x + (lotW - w) / 2, y + (lotH - h) / 2, w, h, opts);
      if (district.name === 'Old Town' && rng() < 0.55) bd.awning = true;
      if (district.name === 'Neon Strip' && rng() < 0.5) {
        const s = pick(rng, NEON_SIGNS); bd.neon = { text: s[0], color: s[1] };
      }
    }
  }
}

function buildBlock(rng, b) {
  const district = districtAt(b.x + b.w / 2, b.y + b.h / 2);
  const role = SPECIAL[blockKey(b)] || 'lots';
  W.blocks.push({ ...b, role, district: district.name });
  if (role === 'plazaCarmen' || role === 'plazaContador' || role === 'plazaPrisma') {
    for (let i = 0; i < 5; i++) W.props.push({ kind: 'bench', x: b.x + 40 + i * 52, y: b.y + b.h - 42 });
    for (let i = 0; i < 3; i++) W.props.push({ kind: 'palm', x: b.x + 50 + i * 90, y: b.y + 46, s: 1 });
    return;
  }
  if (role === 'safehouse') {
    addBuilding(rng, district, b.x + 120, b.y + 130, 150, 110, { height: 30, roof: '#e9c46a', kind: 'house' });
    W.props.push({ kind: 'palm', x: b.x + 70, y: b.y + 300, s: 1.1 });
    W.props.push({ kind: 'palm', x: b.x + 320, y: b.y + 330, s: 0.9 });
    return;
  }
  if (role === 'hospital' || role === 'civic') {
    addBuilding(rng, district, b.x + 90, b.y + 60, 250, 130, { height: 52, roof: '#e9ecef', kind: role });
    if (role === 'civic') addBuilding(rng, district, b.x + 120, b.y + 300, 120, 80, { height: 26, roof: '#ffd166', kind: 'shop' });
    for (let s = 0; s < 4; s++) W.parkingSpots.push({ x: b.x + 90 + s * 54, y: b.y + 250, angle: 0 });
    return;
  }
  if (role === 'casino') {
    const bd = addBuilding(rng, district, b.x + 110, b.y + 120, 230, 170, { height: 64, roof: '#1d3557', kind: 'casino' });
    bd.neon = { text: 'CASINO PERLA', color: '#ff70a6' };
    for (let s = 0; s < 4; s++) W.parkingSpots.push({ x: b.x + 100 + s * 54, y: b.y + 360, angle: 0 });
    return;
  }
  if (role === 'yard' || role === 'depot' || role === 'dockShop') {
    if (role === 'dockShop') addBuilding(rng, district, b.x + 90, b.y + 90, 130, 90, { height: 24, roof: '#ffd166', kind: 'shop' });
    addBuilding(rng, district, b.x + b.w - 260, b.y + 70, 200, 130, { height: 30, kind: 'warehouse' });
    for (let i = 0; i < 7; i++) {
      const cx = b.x + randRange(rng, 40, b.w - 90), cy = b.y + randRange(rng, 240, b.h - 60);
      const c = { x: cx, y: cy, w: 52, h: 26, kind: 'container', color: pick(rng, ['#e63946', '#2a9d8f', '#4361ee', '#f4840b', '#6d6875']) };
      W.props.push(c); W.solids.push(c);
    }
    for (let i = 0; i < 5; i++) W.props.push({ kind: 'crate', x: b.x + randRange(rng, 30, b.w - 30), y: b.y + randRange(rng, 30, b.h - 30) });
    return;
  }
  // Ordinary blocks, flavoured by district.
  if (district.name === 'The Docks') {
    addBuilding(rng, district, b.x + 40, b.y + 50, 210, 140, { height: 32, kind: 'warehouse' });
    addBuilding(rng, district, b.x + 40, b.y + 260, 210, 140, { height: 28, kind: 'warehouse' });
    for (let i = 0; i < 4; i++) {
      const c = { x: b.x + randRange(rng, 270, b.w - 70), y: b.y + randRange(rng, 40, b.h - 50), w: 52, h: 26, kind: 'container', color: pick(rng, ['#e63946', '#2a9d8f', '#4361ee', '#f4840b']) };
      W.props.push(c); W.solids.push(c);
    }
    return;
  }
  if (district.name === 'Palm Hills') { fillLots(rng, district, b, 120, 100, { height: 24, kind: 'house' }); return; }
  if (district.name === 'Old Town') { fillLots(rng, district, b, 96, 84, {}); return; }
  fillLots(rng, district, b, 128, 104, {});
}

export function buildWorld(seed) {
  W.buildings.length = 0; W.solids.length = 0; W.props.length = 0; W.parkingSpots.length = 0; W.blocks.length = 0;
  const rng = makeRng(seed * 7919 + 13);
  for (const b of blockRects()) buildBlock(rng, b);
  // Beach life: palms along the promenade and umbrellas on the sand.
  for (let y = 60; y < WORLD_H - 40; y += randRange(rng, 80, 130)) {
    if (ROADS_H.some((ry) => Math.abs(y - ry) < 80)) continue;
    W.props.push({ kind: 'palm', x: 262 + randRange(rng, -8, 14), y, s: randRange(rng, 0.85, 1.25) });
    if (rng() < 0.6) W.props.push({ kind: 'umbrella', x: 185 + randRange(rng, -14, 14), y: y + randRange(rng, -24, 24), color: pick(rng, ['#ef476f', '#ffd166', '#06d6a0', '#118ab2']) });
  }
  // Street lamps at intersections and along the Strip.
  for (const rx of ROADS_V) for (const ry of ROADS_H) {
    W.props.push({ kind: 'lamp', x: rx - ROAD_W / 2 - 10, y: ry - ROAD_W / 2 - 10 });
    W.props.push({ kind: 'lamp', x: rx + ROAD_W / 2 + 10, y: ry + ROAD_W / 2 + 10 });
  }
  for (let x = 2250; x < 3150; x += 150) W.props.push({ kind: 'lamp', x, y: 575 - ROAD_W / 2 - 10 });
}

// Resolve a circle against building/container solids and the sea.
// Returns the corrected position and whether anything was hit (and how hard).
export function collideCircle(x, y, r) {
  let hit = 0;
  if (x < WATER_X + r && !onPier(x, y)) { x = WATER_X + r; hit = 1; }
  x = clamp(x, r + 4, WORLD_W - r - 4); y = clamp(y, r + 4, WORLD_H - r - 4);
  for (const s of W.solids) {
    if (x < s.x - r || x > s.x + s.w + r || y < s.y - r || y > s.y + s.h + r) continue;
    const cx = clamp(x, s.x, s.x + s.w), cy = clamp(y, s.y, s.y + s.h);
    const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = 1;
    if (d2 > 0.01) { const d = Math.sqrt(d2); x = cx + (dx / d) * r; y = cy + (dy / d) * r; }
    else { // centre inside the box: push out along the smallest exit
      const exits = [x - (s.x - r), (s.x + s.w + r) - x, y - (s.y - r), (s.y + s.h + r) - y];
      const m = Math.min(...exits);
      if (m === exits[0]) x = s.x - r; else if (m === exits[1]) x = s.x + s.w + r;
      else if (m === exits[2]) y = s.y - r; else y = s.y + s.h + r;
    }
  }
  return { x, y, hit };
}

export function randomRoadPoint(rng) {
  if (rng() < 0.5) return { x: pick(rng, ROADS_V), y: randRange(rng, 60, WORLD_H - 60) };
  return { x: randRange(rng, 300, WORLD_W - 60), y: pick(rng, ROADS_H) };
}
