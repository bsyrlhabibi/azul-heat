// Azul Heat — render.js: draws Bahía Azul in a shaded 3/4 view. Ground first
// (district tints, roads with lane paint, the beach and the sea), then every
// building, tree, car and person in one back-to-front pass sorted by their ground
// line, so tall buildings overlap what stands behind them. Golden-hour light is a
// warm vignette over everything; neon signs glow on the Strip.

import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, BEACH_X, WATER_X, DISTRICTS, PALETTE } from './config.js';
import { G } from './state.js';
import { drawCar } from './vehicles.js';
import { drawPerson } from './characters.js';
import { drawHeli } from './police.js';
import { GIG_SPOTS, gigMarker } from './gigs.js';
import { missionMarker, offerMarkers } from './story.js';

export function drawScene(c, vw, vh) {
  const cam = G.camera;
  c.save();
  c.translate(-cam.x, -cam.y);
  drawGround(c, cam, vw, vh);
  drawMarkers(c);
  // One painter's pass, sorted by ground line.
  const items = [];
  for (const b of G.world.buildings) items.push({ y: b.y + b.d, kind: 'b', o: b });
  for (const t of G.world.trees) items.push({ y: t.y + 4, kind: 't', o: t });
  for (const car of G.cars) if (!car.gone) items.push({ y: car.y + car.model.w / 2, kind: 'c', o: car });
  for (const ped of G.peds) items.push({ y: ped.y + 4, kind: 'p', o: ped });
  if (G.other) items.push({ y: G.other.y + 4, kind: 'r', o: G.other });
  if (G.player && !G.player.inCar) items.push({ y: G.player.y + 4, kind: 'r', o: G.player });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.kind === 'b') drawBuilding(c, it.o);
    else if (it.kind === 't') drawTree(c, it.o);
    else if (it.kind === 'c') drawCar(c, it.o);
    else drawPerson(c, it.o);
  }
  // Tracers and particles float above the sorted pass.
  for (const b of G.bullets) {
    c.strokeStyle = `rgba(255,230,150,${1 - b.t / 0.09})`;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke();
  }
  for (const pt of G.particles) drawParticle(c, pt);
  drawHeli(c);
  c.restore();
  // Golden-hour vignette.
  const grad = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
  grad.addColorStop(0, 'rgba(255,140,50,0)');
  grad.addColorStop(1, 'rgba(120,30,60,0.22)');
  c.fillStyle = grad;
  c.fillRect(0, 0, vw, vh);
}

function drawGround(c, cam, vw, vh) {
  const x0 = Math.max(0, cam.x - 40), y0 = Math.max(0, cam.y - 40);
  const x1 = Math.min(WORLD_W, cam.x + vw + 40), y1 = Math.min(WORLD_H, cam.y + vh + 40);
  for (const d of DISTRICTS) {
    c.fillStyle = d.ground;
    c.fillRect(Math.max(d.x, x0), Math.max(d.y, y0), Math.min(d.x + d.w, x1) - Math.max(d.x, x0), Math.min(d.y + d.h, y1) - Math.max(d.y, y0));
  }
  // Beach and sea.
  c.fillStyle = PALETTE.sand;
  c.fillRect(BEACH_X, y0, WATER_X - BEACH_X, y1 - y0);
  const wg = c.createLinearGradient(WATER_X, 0, WORLD_W, 0);
  wg.addColorStop(0, PALETTE.water2); wg.addColorStop(1, PALETTE.water1);
  c.fillStyle = wg;
  c.fillRect(WATER_X, y0, WORLD_W - WATER_X, y1 - y0);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
  for (let y = Math.floor(y0 / 46) * 46; y < y1; y += 46) {
    const off = Math.sin(G.time * 1.4 + y) * 8;
    c.beginPath(); c.moveTo(WATER_X + 12 + off, y); c.lineTo(WATER_X + 44 + off, y); c.stroke();
  }
  // Sidewalks then asphalt.
  c.fillStyle = PALETTE.sidewalk;
  for (const cx of ROADS_X) c.fillRect(cx - ROAD_W / 2 - 13, y0, ROAD_W + 26, y1 - y0);
  for (const cy of ROADS_Y) c.fillRect(x0, cy - ROAD_W / 2 - 13, x1 - x0, ROAD_W + 26);
  c.fillStyle = PALETTE.road;
  for (const cx of ROADS_X) c.fillRect(cx - ROAD_W / 2, y0, ROAD_W, y1 - y0);
  for (const cy of ROADS_Y) c.fillRect(x0, cy - ROAD_W / 2, x1 - x0, ROAD_W);
  // Lane paint: dashed centre lines and lane guides.
  c.strokeStyle = PALETTE.lane; c.lineWidth = 3; c.setLineDash([22, 18]);
  for (const cx of ROADS_X) { c.beginPath(); c.moveTo(cx, y0); c.lineTo(cx, y1); c.stroke(); }
  for (const cy of ROADS_Y) { c.beginPath(); c.moveTo(x0, cy); c.lineTo(x1, cy); c.stroke(); }
  c.setLineDash([]);
  // Safehouse garage pad.
  const sh = G.world.safehouse;
  c.fillStyle = '#6b6156';
  c.fillRect(sh.garage.x, sh.garage.y, sh.garage.w, sh.garage.h);
  c.strokeStyle = '#ffd75e'; c.lineWidth = 2; c.setLineDash([8, 6]);
  c.strokeRect(sh.garage.x, sh.garage.y, sh.garage.w, sh.garage.h);
  c.setLineDash([]);
}

function drawBuilding(c, b) {
  c.fillStyle = 'rgba(40,16,40,0.22)';
  c.fillRect(b.x + 9, b.y + 12, b.w, b.d);
  // South wall with windows, then the roof lifted by the building's height.
  c.fillStyle = b.wall;
  c.fillRect(b.x, b.y + b.d - b.h, b.w, b.h);
  c.fillStyle = 'rgba(255,236,170,0.75)';
  const cols = Math.max(1, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 20));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (((b.x * 7 + b.y * 13 + i * 31 + j * 57) % 10) < 6) {
      c.fillRect(b.x + 8 + i * 26, b.y + b.d - b.h + 7 + j * 20, 11, 9);
    }
  }
  const rg = c.createLinearGradient(b.x, b.y - b.h, b.x, b.y + b.d - b.h);
  rg.addColorStop(0, b.roof); rg.addColorStop(1, b.color);
  c.fillStyle = rg;
  c.fillRect(b.x, b.y - b.h, b.w, b.d);
  c.strokeStyle = 'rgba(60,30,20,0.35)'; c.lineWidth = 2;
  c.strokeRect(b.x, b.y - b.h, b.w, b.d);
  c.fillStyle = 'rgba(0,0,0,0.13)';
  if (b.w > 70) c.fillRect(b.x + b.w * 0.18, b.y - b.h + b.d * 0.2, 22, 14);
  if (b.d > 70) c.fillRect(b.x + b.w * 0.62, b.y - b.h + b.d * 0.55, 16, 12);
  if (b.sign) {
    c.save();
    c.shadowColor = '#ff4fd8'; c.shadowBlur = 16;
    c.fillStyle = '#ffe3fa';
    c.font = `bold ${Math.min(19, b.w / 6)}px system-ui`;
    c.textAlign = 'center';
    c.fillText(b.sign, b.x + b.w / 2, b.y + b.d - b.h / 2 + 6);
    c.restore();
  }
}

function drawTree(c, t) {
  c.fillStyle = 'rgba(40,16,40,0.25)';
  c.beginPath(); c.ellipse(t.x + 5, t.y + 5, 13, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7a5230';
  c.fillRect(t.x - 2.5, t.y - 12, 5, 16);
  c.fillStyle = '#3e8e4f';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t.x;
    c.beginPath();
    c.ellipse(t.x + Math.cos(a) * 8, t.y - 16 + Math.sin(a) * 4, 12, 5.5, a, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#57ab63';
  c.beginPath(); c.arc(t.x, t.y - 17, 6.5, 0, Math.PI * 2); c.fill();
}

function drawParticle(c, pt) {
  const f = pt.t / pt.life;
  if (pt.kind === 'smoke') {
    c.fillStyle = `rgba(70,64,70,${0.4 * (1 - f)})`;
    c.beginPath(); c.arc(pt.x, pt.y, pt.size * (1 + f), 0, Math.PI * 2); c.fill();
  } else if (pt.kind === 'spark') {
    c.fillStyle = `rgba(255,210,90,${1 - f})`;
    c.fillRect(pt.x - 3, pt.y - 1, 6, 2); c.fillRect(pt.x - 1, pt.y - 3, 2, 6);
  } else if (pt.kind === 'cash') {
    c.fillStyle = `rgba(80,220,120,${1 - f})`;
    c.font = 'bold 13px system-ui'; c.textAlign = 'center';
    c.fillText('$', pt.x, pt.y);
  }
}

function ring(c, x, y, color, label) {
  const pulse = 1 + Math.sin(G.time * 5) * 0.12;
  c.save();
  c.strokeStyle = color; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 26 * pulse, 0, Math.PI * 2); c.stroke();
  c.fillStyle = color;
  c.font = 'bold 15px system-ui'; c.textAlign = 'center';
  c.fillText(label, x, y - 36 - Math.sin(G.time * 5) * 3);
  c.restore();
}

function drawMarkers(c) {
  // Gig start rings, shop signs and the safehouse marker live in the world itself.
  for (const spot of GIG_SPOTS) ring(c, spot.x, spot.y, spot.color, spot.name);
  for (const shop of G.world.gunShops) {
    c.fillStyle = '#263238';
    c.beginPath(); c.roundRect(shop.x - 26, shop.y - 40, 52, 20, 5); c.fill();
    c.fillStyle = '#ffd75e'; c.font = 'bold 11px system-ui'; c.textAlign = 'center';
    c.fillText('🔫 GUNS', shop.x, shop.y - 26);
  }
  const sh = G.world.safehouse;
  c.fillStyle = '#ffd75e'; c.font = 'bold 13px system-ui'; c.textAlign = 'center';
  c.fillText('🏠 SAFEHOUSE', sh.x, sh.y - 14);
  c.fillStyle = '#e74c3c'; c.font = 'bold 15px system-ui';
  c.fillText('✚ HOSPITAL', G.world.hospital.x, G.world.hospital.y - 12);
  // The current objective gets a gold beacon; available contacts get a "!".
  const mm = missionMarker();
  if (mm) {
    const grad = c.createLinearGradient(0, mm.y - 190, 0, mm.y);
    grad.addColorStop(0, 'rgba(255,215,94,0)');
    grad.addColorStop(1, 'rgba(255,215,94,0.30)');
    c.fillStyle = grad;
    c.fillRect(mm.x - 13, mm.y - 190, 26, 190);
    ring(c, mm.x, mm.y, '#ffd75e', '▼');
  }
  const gm = gigMarker();
  if (gm) ring(c, gm.x, gm.y, '#4dd0e1', '▼');
  for (const offer of offerMarkers()) ring(c, offer.x, offer.y, '#ffd75e', '!');
}
