// render.js — draws Bahía Azul: animated water, warm district ground,
// roads, then every solid and soul in one back-to-front painter's pass —
// gradient-shaded 3/4 buildings with lit windows, rooftop clutter, neon
// glow — finished with a golden-hour grade and vignette over everything.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, WATER_X, SAND_X, ROAD_W, ROADS_V, ROADS_H, DISTRICTS, CONTACTS, PLACES } from './config.js';
import { G, activeRunner } from './state.js';
import { W, PIER, districtAt } from './world.js';
import { drawCar, shade, roundRect } from './vehicles.js';
import { drawFigure } from './pedestrians.js';
import { clamp } from './random.js';

function hash2(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
function inView(x, y, m = 160) {
  return x > G.cam.x - m && x < G.cam.x + VIEW_W + m && y > G.cam.y - m && y < G.cam.y + VIEW_H + m;
}

export function drawWorld(ctx) {
  const { x: cx, y: cy } = G.cam;
  const shX = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  const shY = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  ctx.save();
  ctx.translate(-cx + shX, -cy + shY);
  drawGround(ctx);
  // Painter's pass: everything with a base line, sorted back to front.
  const items = [];
  for (const b of W.buildings) if (inView(b.x + b.w / 2, b.y + b.h / 2, 260)) items.push({ y: b.y + b.h, f: () => drawBuilding(ctx, b) });
  for (const p of W.props) if (inView(p.x, p.y, 120)) items.push({ y: p.y + (p.kind === 'container' ? p.h : 2), f: () => drawProp(ctx, p) });
  for (const car of G.cars) if (inView(car.x, car.y, 120)) items.push({ y: car.y + 10, f: () => drawCar(ctx, car) });
  for (const p of G.peds) if (inView(p.x, p.y, 60)) items.push({ y: p.y, f: () => drawPedestrian(ctx, p) });
  for (const e of G.enemies) if (inView(e.x, e.y, 60)) items.push({ y: e.y, f: () => drawPedestrian(ctx, e) });
  for (const c of CONTACTS) {
    const p = PLACES[c.place];
    if (inView(p.x, p.y, 80)) items.push({ y: p.y, f: () => drawContact(ctx, c, p) });
  }
  const other = G.runners[G.active === 'lucia' ? 'marco' : 'lucia'];
  const otherDef = G.active === 'lucia' ? { skin: '#7c4b26', hair: '#0e0c0a', top: '#e8873a', bottom: '#3a3230', accent: '#f4f1e6', name: 'Marco' } : { skin: '#a0663a', hair: '#1c1210', top: '#0fb5a8', bottom: '#27324a', accent: '#ffd23f', name: 'Lucía' };
  if (!other.car && inView(other.x, other.y, 60)) items.push({ y: other.y, f: () => { drawFigure(ctx, other.x, other.y, other.angle, other.walk, otherDef, 1.12); drawName(ctx, other.x, other.y - 30, otherDef.name); } });
  const r = activeRunner();
  if (!r.car) items.push({ y: r.y + 1, f: () => drawFigure(ctx, r.x, r.y, r.angle, r.walk, activePalette(), 1.18) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  drawMarker(ctx);
  drawParticles(ctx);
  drawGlowPass(ctx);
  drawHelicopter(ctx);
  ctx.restore();
  drawGrade(ctx);
}

function activePalette() {
  return G.active === 'lucia'
    ? { skin: '#a0663a', hair: '#1c1210', top: '#0fb5a8', bottom: '#27324a', accent: '#ffd23f' }
    : { skin: '#7c4b26', hair: '#0e0c0a', top: '#e8873a', bottom: '#3a3230', accent: '#f4f1e6' };
}
function drawName(ctx, x, y, text) {
  ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,8,14,0.55)';
  const w = ctx.measureText(text).width + 10;
  roundRect(ctx, x - w / 2, y - 10, w, 15, 7); ctx.fill();
  ctx.fillStyle = '#ffe9b0'; ctx.fillText(text, x, y + 1.5);
  ctx.textAlign = 'left';
}
function drawPedestrian(ctx, p) {
  if (p.down) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.globalAlpha = Math.max(0, p.fade ?? 1);
    ctx.fillStyle = p.top; roundRect(ctx, -11, -5, 22, 10, 5); ctx.fill();
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(14, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  drawFigure(ctx, p.x, p.y, p.angle, p.walk, p, 1);
  if (p.hostile) { ctx.fillStyle = '#ff5d5d'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', p.x, p.y - 30); ctx.textAlign = 'left'; }
}
function drawContact(ctx, c, p) {
  const bob = Math.sin(G.time * 2.4) * 2;
  ctx.strokeStyle = 'rgba(255,210,63,0.75)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 17, 7, 0, 0, Math.PI * 2); ctx.stroke();
  drawFigure(ctx, p.x, p.y, -Math.PI / 2, G.time * 1.4, c, 1.12);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('!', p.x, p.y - 40 + bob);
  drawName(ctx, p.x, p.y - 26, c.name);
  ctx.textAlign = 'left';
}

function drawGround(ctx) {
  const { x: cx, y: cy } = G.cam;
  // Sea, with a sunset path of sparkles.
  const sea = ctx.createLinearGradient(cx, 0, cx + VIEW_W, 0);
  sea.addColorStop(0, '#0d4d5c'); sea.addColorStop(0.5, '#11697a'); sea.addColorStop(1, '#0a3d4d');
  ctx.fillStyle = sea;
  ctx.fillRect(cx, cy, Math.max(0, WATER_X - cx), VIEW_H + 4);
  ctx.fillStyle = 'rgba(255,166,88,0.20)';
  ctx.fillRect(cx, cy, Math.max(0, WATER_X - cx), VIEW_H + 4);
  for (let gx = Math.floor(cx / 90) * 90; gx < Math.min(WATER_X, cx + VIEW_W); gx += 90) {
    for (let gy = Math.floor(cy / 90) * 90; gy < cy + VIEW_H; gy += 90) {
      const h = hash2(gx, gy), a = 0.10 + 0.30 * Math.abs(Math.sin(G.time * 1.7 + h * 21));
      ctx.fillStyle = `rgba(255,205,130,${a.toFixed(3)})`;
      ctx.fillRect(gx + h * 60, gy + h * 47, 16 + h * 22, 2.2);
    }
  }
  // District ground.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(Math.max(d.x, SAND_X), d.y, d.w - Math.max(0, SAND_X - d.x), d.h);
  }
  // Sand and promenade.
  ctx.fillStyle = '#ecc07c'; ctx.fillRect(WATER_X, cy - 4, SAND_X - WATER_X, VIEW_H + 8);
  ctx.fillStyle = '#d9b06c'; for (let y = Math.floor(cy / 46) * 46; y < cy + VIEW_H; y += 46) ctx.fillRect(WATER_X, y, SAND_X - WATER_X, 2);
  ctx.fillStyle = '#b09a76'; ctx.fillRect(SAND_X, cy - 4, 26, VIEW_H + 8);
  // Pier planks over the water.
  ctx.fillStyle = '#8a6844'; ctx.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  ctx.fillStyle = '#77572f';
  for (let x = PIER.x + 8; x < PIER.x + PIER.w; x += 18) ctx.fillRect(x, PIER.y, 3, PIER.h);
  ctx.fillStyle = '#5e4525';
  for (const px of [PIER.x + 6, PIER.x + PIER.w - 10]) for (let y = PIER.y + 8; y < PIER.y + PIER.h; y += 26) ctx.fillRect(px, y, 5, 8);
  // Block paving (sidewalks and plaza floors sit above district ground).
  for (const b of W.blocks) {
    if (!inView(b.x + b.w / 2, b.y + b.h / 2, 420)) continue;
    ctx.fillStyle = b.role.startsWith('plaza') ? '#c2a878' : b.district === 'Palm Hills' ? '#6d8a58' : '#9c8b72';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    if (b.role.startsWith('plaza')) {
      ctx.strokeStyle = 'rgba(90,70,40,0.35)'; ctx.lineWidth = 1;
      for (let x = b.x + 30; x < b.x + b.w - 10; x += 34) { ctx.beginPath(); ctx.moveTo(x, b.y + 8); ctx.lineTo(x, b.y + b.h - 8); ctx.stroke(); }
    }
  }
  // Roads: warm asphalt, amber centre dashes, pale edges.
  ctx.fillStyle = '#3c3942';
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2, cy - 4, ROAD_W, VIEW_H + 8);
  for (const ry of ROADS_H) ctx.fillRect(cx - 4, ry - ROAD_W / 2, VIEW_W + 8, ROAD_W);
  ctx.fillStyle = 'rgba(244,241,230,0.5)';
  for (const rx of ROADS_V) { ctx.fillRect(rx - ROAD_W / 2, cy - 4, 2.5, VIEW_H + 8); ctx.fillRect(rx + ROAD_W / 2 - 2.5, cy - 4, 2.5, VIEW_H + 8); }
  for (const ry of ROADS_H) { ctx.fillRect(cx - 4, ry - ROAD_W / 2, VIEW_W + 8, 2.5); ctx.fillRect(cx - 4, ry + ROAD_W / 2 - 2.5, VIEW_W + 8, 2.5); }
  ctx.fillStyle = '#ffb703';
  for (const rx of ROADS_V) for (let y = Math.floor(cy / 56) * 56; y < cy + VIEW_H; y += 56) ctx.fillRect(rx - 1.5, y, 3, 30);
  for (const ry of ROADS_H) for (let x = Math.floor(cx / 56) * 56; x < cx + VIEW_W; x += 56) ctx.fillRect(x, ry - 1.5, 30, 3);
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(244,241,230,0.55)';
  for (const rx of ROADS_V) for (const ry of ROADS_H) {
    if (!inView(rx, ry, 200)) continue;
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(rx - ROAD_W / 2 + 4, ry + i * 17 - 3, 12, 6);
      ctx.fillRect(rx + ROAD_W / 2 - 16, ry + i * 17 - 3, 12, 6);
      ctx.fillRect(rx + i * 17 - 3, ry - ROAD_W / 2 + 4, 6, 12);
      ctx.fillRect(rx + i * 17 - 3, ry + ROAD_W / 2 - 16, 6, 12);
    }
  }
  // Parking stall lines.
  ctx.strokeStyle = 'rgba(244,241,230,0.4)'; ctx.lineWidth = 1.6;
  for (const s of W.parkingSpots) {
    if (!inView(s.x, s.y, 80)) continue;
    ctx.strokeRect(s.x - 26, s.y - 13, 52, 26);
  }
}

function drawBuilding(ctx, b) {
  const e = b.height * 0.62;                       // extrusion: how tall it reads
  const wall = shade(b.roof, 0.52), roofTop = shade(b.roof, 1.12);
  // Long warm shadow to the south-east.
  ctx.fillStyle = 'rgba(46,16,44,0.22)';
  ctx.fillRect(b.x + e * 0.55, b.y + e * 0.30, b.w, b.h);
  // South wall with lit windows.
  ctx.fillStyle = wall;
  ctx.fillRect(b.x, b.y + b.h - e, b.w, e);
  const cols = Math.max(2, Math.floor(b.w / 17)), rows = Math.max(1, Math.floor(e / 14));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const lit = hash2(b.x + i * 31, b.y + j * 57) > 0.42;
    ctx.fillStyle = lit ? 'rgba(255,214,140,0.92)' : 'rgba(20,22,34,0.55)';
    ctx.fillRect(b.x + 5 + i * ((b.w - 10) / cols), b.y + b.h - e + 4 + j * ((e - 7) / Math.max(1, rows)), 7.5, 8);
  }
  // Roof slab.
  ctx.fillStyle = roofTop;
  ctx.fillRect(b.x, b.y - e, b.w, b.h);
  ctx.strokeStyle = shade(b.roof, 0.7); ctx.lineWidth = 3;
  ctx.strokeRect(b.x + 2.5, b.y - e + 2.5, b.w - 5, b.h - 5);
  // Rooftop clutter: AC boxes and the odd water tank.
  ctx.fillStyle = 'rgba(210,214,220,0.75)';
  for (let i = 0; i < b.ac; i++) {
    const ax = b.x + 10 + hash2(b.x, i * 13) * (b.w - 34), ay = b.y - e + 9 + hash2(b.y, i * 29) * (b.h - 30);
    ctx.fillRect(ax, ay, 15, 11);
    ctx.fillStyle = 'rgba(90,96,110,0.8)'; ctx.fillRect(ax, ay, 15, 3); ctx.fillStyle = 'rgba(210,214,220,0.75)';
  }
  if (b.tank && b.h > 90) {
    const tx = b.x + b.w - 34, ty = b.y - e + 12;
    ctx.fillStyle = '#7a4a2b'; ctx.fillRect(tx, ty, 20, 15);
    ctx.fillStyle = '#96603a'; ctx.beginPath(); ctx.ellipse(tx + 10, ty, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (b.kind === 'house') { // pitched-roof ridge for Palm Hills homes
    ctx.strokeStyle = shade(b.roof, 0.62); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(b.x + 6, b.y - e + b.h / 2); ctx.lineTo(b.x + b.w - 6, b.y - e + b.h / 2); ctx.stroke();
  }
  if (b.kind === 'warehouse') {
    ctx.fillStyle = 'rgba(15,18,24,0.5)';
    ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h - e, 44, e);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.4;
    for (let y = b.y + b.h - e + 6; y < b.y + b.h - 3; y += 7) { ctx.beginPath(); ctx.moveTo(b.x + 3, y); ctx.lineTo(b.x + b.w - 3, y); ctx.stroke(); }
  }
  if (b.kind === 'hospital') { ctx.fillStyle = '#e63946'; const hx = b.x + b.w / 2, hy = b.y - e + b.h / 2; ctx.fillRect(hx - 4, hy - 13, 8, 26); ctx.fillRect(hx - 13, hy - 4, 26, 8); }
  if (b.kind === 'civic') { ctx.fillStyle = '#4361ee'; ctx.fillRect(b.x, b.y + b.h - e, b.w, 8); }
  if (b.kind === 'shop') {
    ctx.fillStyle = '#14161c'; ctx.fillRect(b.x, b.y + b.h - e - 2, b.w, 13);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 9.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('AMMU-NACIÓN', b.x + b.w / 2, b.y + b.h - e + 8); ctx.textAlign = 'left';
  }
  if (b.awning) {
    for (let i = 0; i < Math.floor(b.w / 11); i++) { ctx.fillStyle = i % 2 ? '#f4f1e6' : '#c9403d'; ctx.fillRect(b.x + i * 11, b.y + b.h - 3, 11, 6); }
  }
  if (b.neon) {
    ctx.save();
    ctx.shadowColor = b.neon.color; ctx.shadowBlur = 17;
    ctx.fillStyle = b.neon.color;
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(b.neon.text, b.x + b.w / 2, b.y + b.h - e + 17);
    ctx.restore();
    ctx.textAlign = 'left';
  }
}

function drawProp(ctx, p) {
  if (p.kind === 'palm') {
    const s = p.s || 1;
    ctx.fillStyle = 'rgba(46,16,44,0.25)';
    ctx.beginPath(); ctx.ellipse(p.x + 9, p.y + 3, 13 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 4.4 * s;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + 3 * s, p.y - 13 * s, p.x + 6 * s, p.y - 25 * s); ctx.stroke();
    ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 3 * s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.moveTo(p.x + 6 * s, p.y - 25 * s);
      ctx.quadraticCurveTo(p.x + 6 * s + Math.cos(a) * 10 * s, p.y - 25 * s + Math.sin(a) * 5 * s - 3, p.x + 6 * s + Math.cos(a) * 16 * s, p.y - 25 * s + Math.sin(a) * 8 * s + 4 * s);
      ctx.stroke();
    }
  } else if (p.kind === 'lamp') {
    ctx.fillStyle = '#2c2f36'; ctx.fillRect(p.x - 1.6, p.y - 15, 3.2, 15);
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(p.x, p.y - 17, 3.6, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'bench') {
    ctx.fillStyle = '#8a6844'; ctx.fillRect(p.x - 13, p.y - 3, 26, 5);
    ctx.fillStyle = '#6e5233'; ctx.fillRect(p.x - 13, p.y - 9, 26, 3.4);
  } else if (p.kind === 'crate') {
    ctx.fillStyle = '#a97c50'; ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.6; ctx.strokeRect(p.x - 8, p.y - 8, 16, 16);
    ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 8); ctx.lineTo(p.x + 8, p.y + 8); ctx.moveTo(p.x + 8, p.y - 8); ctx.lineTo(p.x - 8, p.y + 8); ctx.stroke();
  } else if (p.kind === 'container') {
    ctx.fillStyle = 'rgba(46,16,44,0.22)'; ctx.fillRect(p.x + 5, p.y + 4, p.w, p.h);
    ctx.fillStyle = shade(p.color, 0.9); ctx.fillRect(p.x, p.y - 6, p.w, p.h);
    ctx.fillStyle = shade(p.color, 1.15); ctx.fillRect(p.x, p.y - 6, p.w, 6);
    ctx.strokeStyle = 'rgba(10,10,16,0.35)'; ctx.lineWidth = 1.4;
    for (let x = p.x + 7; x < p.x + p.w - 3; x += 8) { ctx.beginPath(); ctx.moveTo(x, p.y - 4); ctx.lineTo(x, p.y + p.h - 8); ctx.stroke(); }
  } else if (p.kind === 'umbrella') {
    ctx.fillStyle = 'rgba(46,16,44,0.20)';
    ctx.beginPath(); ctx.ellipse(p.x + 6, p.y + 4, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 13); ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(p.x - 16, p.y - 12); ctx.lineTo(p.x + 16, p.y - 12); ctx.lineTo(p.x, p.y - 24); ctx.closePath(); ctx.fill();
  }
}

function drawMarker(ctx) {
  const m = G.marker;
  if (!m) return;
  const bob = Math.sin(G.time * 4) * 5;
  ctx.strokeStyle = m.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(m.x, m.y, 24 + Math.sin(G.time * 4) * 4, 11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = m.color;
  ctx.beginPath();
  ctx.moveTo(m.x, m.y - 44 + bob); ctx.lineTo(m.x - 10, m.y - 62 + bob); ctx.lineTo(m.x + 10, m.y - 62 + bob);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(m.x - 1.6, m.y - 62 + bob, 3.2, -14);
}

function drawParticles(ctx) {
  for (const t of G.tracers) {
    ctx.strokeStyle = `rgba(255,240,180,${(1 - t.t) * 0.85})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x2, t.y2); ctx.stroke();
  }
  for (const p of G.particles) {
    const k = 1 - p.t / p.life;
    if (p.kind === 'smoke') { ctx.fillStyle = `rgba(70,66,72,${0.34 * k})`; ctx.beginPath(); ctx.arc(p.x, p.y, 5 + p.t * 13, 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === 'fire') { ctx.fillStyle = `rgba(255,${120 + Math.floor(90 * k)},40,${0.75 * k})`; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - k) * 5, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = `rgba(255,205,90,${k})`; ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2); }
  }
}

function drawGlowPass(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of W.props) {
    if (p.kind !== 'lamp' || !inView(p.x, p.y, 90)) continue;
    const g = ctx.createRadialGradient(p.x, p.y - 14, 2, p.x, p.y - 14, 46);
    g.addColorStop(0, 'rgba(255,190,100,0.16)'); g.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.fillStyle = g; ctx.fillRect(p.x - 46, p.y - 60, 92, 92);
  }
  for (const b of W.buildings) {
    if (!b.neon || !inView(b.x, b.y, 200)) continue;
    const g = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.h, 4, b.x + b.w / 2, b.y + b.h, 74);
    g.addColorStop(0, 'rgba(255,120,200,0.10)'); g.addColorStop(1, 'rgba(255,120,200,0)');
    ctx.fillStyle = g; ctx.fillRect(b.x - 30, b.y + b.h - 74, b.w + 60, 110);
  }
  const heli = G.police.heli;
  if (heli.active) {
    const g = ctx.createRadialGradient(heli.lightX, heli.lightY, 8, heli.lightX, heli.lightY, 128);
    g.addColorStop(0, 'rgba(255,246,200,0.30)'); g.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(heli.lightX, heli.lightY, 128, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHelicopter(ctx) {
  const heli = G.police.heli;
  if (!heli.active) return;
  const hx = heli.x, hy = heli.y - 118;
  ctx.fillStyle = 'rgba(30,10,34,0.30)';
  ctx.beginPath(); ctx.ellipse(heli.x + 26, heli.y + 14, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,200,0.16)'; ctx.lineWidth = 26;
  ctx.beginPath(); ctx.moveTo(hx, hy + 8); ctx.lineTo(heli.lightX, heli.lightY); ctx.stroke();
  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(heli.angle);
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.ellipse(0, 0, 27, 12.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-46, -3.4, 24, 6.8);
  ctx.fillStyle = '#7fd4ff'; ctx.beginPath(); ctx.ellipse(11, 0, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff3049'; ctx.beginPath(); ctx.arc(-47, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,238,248,0.5)'; ctx.lineWidth = 3.4;
  const ra = G.time * 43;
  ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 36, Math.sin(ra) * 5); ctx.lineTo(-Math.cos(ra) * 36, -Math.sin(ra) * 5); ctx.stroke();
  ctx.restore();
}

// The golden-hour grade: warm light wash, hotter at the top of the frame,
// and a soft vignette so the city feels sun-soaked rather than flat.
function drawGrade(ctx) {
  const lin = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  lin.addColorStop(0, 'rgba(255,110,64,0.13)');
  lin.addColorStop(0.55, 'rgba(255,150,60,0.05)');
  lin.addColorStop(1, 'rgba(64,20,80,0.10)');
  ctx.fillStyle = lin; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const rad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  rad.addColorStop(0, 'rgba(30,8,40,0)');
  rad.addColorStop(1, 'rgba(30,8,40,0.26)');
  ctx.fillStyle = rad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function districtBannerCheck() {
  const r = activeRunner();
  const d = districtAt(r.x, r.y);
  if (d.name !== G.district) { G.district = d.name; G.bannerT = 3.4; }
}
