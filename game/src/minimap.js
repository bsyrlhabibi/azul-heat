// Azul Heat — minimap.js: the circular minimap on the HUD and the full-city map
// screen. Both draw the same world — district tints, the road grid, the sea — and
// the same blips: gold for the mission, cyan for gigs, blue for police, a house
// for the safehouse, a white arrow for you.

import { WORLD_W, WORLD_H, ROADS_X, ROADS_Y, WATER_X, DISTRICTS } from './config.js';
import { G } from './state.js';
import { activePos } from './characters.js';
import { missionMarker, offerMarkers } from './story.js';
import { gigMarker, GIG_SPOTS } from './gigs.js';
import { MISSIONS } from './missions.js';

function blips() {
  const out = [];
  const mm = missionMarker();
  if (mm) out.push({ x: mm.x, y: mm.y, color: '#ffd75e', r: 4.4 });
  for (const o of offerMarkers()) out.push({ x: o.x, y: o.y, color: '#ffd75e', r: 3.4 });
  const gm = gigMarker();
  if (gm) out.push({ x: gm.x, y: gm.y, color: '#4dd0e1', r: 4 });
  for (const s of GIG_SPOTS) out.push({ x: s.x, y: s.y, color: s.color, r: 2.6 });
  out.push({ x: G.world.safehouse.x, y: G.world.safehouse.y, color: '#8dff9a', r: 3 });
  if (G.police.stars > 0) {
    for (const car of G.cars) if (car.kind === 'police') out.push({ x: car.x, y: car.y, color: '#4da3ff', r: 3 });
    if (G.police.heli) out.push({ x: G.police.heli.x, y: G.police.heli.y, color: '#4da3ff', r: 3.6 });
  }
  return out;
}

export function drawMinimap(c, cx, cy, r) {
  const pos = activePos();
  const scale = (r * 2) / 980; // ~980 world units across the glass
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#20262b';
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  const px = (wx) => cx + (wx - pos.x) * scale;
  const py = (wy) => cy + (wy - pos.y) * scale;
  for (const d of DISTRICTS) {
    c.fillStyle = d.tint;
    c.globalAlpha = 0.5;
    c.fillRect(px(d.x), py(d.y), d.w * scale, d.h * scale);
  }
  c.globalAlpha = 1;
  c.fillStyle = '#2fa3c7';
  c.fillRect(px(WATER_X), cy - r, r * 2, r * 2);
  c.strokeStyle = '#596270'; c.lineWidth = Math.max(2, 120 * scale);
  for (const rx of ROADS_X) { c.beginPath(); c.moveTo(px(rx), cy - r); c.lineTo(px(rx), cy + r); c.stroke(); }
  for (const ry of ROADS_Y) { c.beginPath(); c.moveTo(cx - r, py(ry)); c.lineTo(cx + r, py(ry)); c.stroke(); }
  for (const b of blips()) {
    const bx = px(b.x), by = py(b.y);
    if (bx < cx - r || bx > cx + r || by < cy - r || by > cy + r) continue;
    c.fillStyle = b.color;
    c.beginPath(); c.arc(bx, by, b.r, 0, Math.PI * 2); c.fill();
  }
  // You, centre, pointing your way.
  const ang = G.player.inCar ? G.player.inCar.angle : G.player.angle;
  c.translate(cx, cy); c.rotate(ang);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(8, 0); c.lineTo(-6, -5); c.lineTo(-6, 5); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#fff'; c.font = 'bold 11px system-ui'; c.textAlign = 'center';
  c.fillText('N', cx, cy - r - 5);
  const d = G.district;
  if (d) { c.font = 'bold 11.5px system-ui'; c.fillText(d.name, cx, cy + r + 15); }
}

export function drawMapScreen(c, w, h) {
  c.save();
  c.fillStyle = '#14101d';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd75e'; c.font = 'bold 26px system-ui'; c.textAlign = 'left';
  c.fillText('BAHÍA AZUL', 34, 46);
  c.fillStyle = '#9fb4c0'; c.font = '13px system-ui';
  c.fillText('M or Esc — back to the street', 34, 68);
  const mw = Math.min(w - 380, (h - 130) * (WORLD_W / WORLD_H));
  const mh = mw * (WORLD_H / WORLD_W);
  const mx = 34, my = 92, s = mw / WORLD_W;
  for (const d of DISTRICTS) {
    c.fillStyle = d.ground;
    c.fillRect(mx + d.x * s, my + d.y * s, d.w * s, d.h * s);
  }
  c.fillStyle = '#2fa3c7';
  c.fillRect(mx + WATER_X * s, my, (WORLD_W - WATER_X) * s, WORLD_H * s);
  c.strokeStyle = '#3b3f4a'; c.lineWidth = Math.max(2, 120 * s);
  for (const rx of ROADS_X) { c.beginPath(); c.moveTo(mx + rx * s, my); c.lineTo(mx + rx * s, my + mh); c.stroke(); }
  for (const ry of ROADS_Y) { c.beginPath(); c.moveTo(mx, my + ry * s); c.lineTo(mx + mw, my + ry * s); c.stroke(); }
  c.fillStyle = 'rgba(20,10,20,0.72)';
  c.font = 'bold 13px system-ui'; c.textAlign = 'center';
  for (const d of DISTRICTS) {
    c.fillText(d.name, mx + (d.x + d.w / 2) * s, my + (d.y + d.h / 2) * s);
  }
  for (const b of blips()) {
    c.fillStyle = b.color;
    c.beginPath(); c.arc(mx + b.x * s, my + b.y * s, Math.max(3, b.r), 0, Math.PI * 2); c.fill();
  }
  const pos = activePos();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(mx + pos.x * s, my + pos.y * s, 5.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#ffd75e'; c.lineWidth = 2;
  c.beginPath(); c.arc(mx + pos.x * s, my + pos.y * s, 9 + Math.sin(G.time * 5) * 2, 0, Math.PI * 2); c.stroke();
  // Standing panel.
  const px = mx + mw + 26;
  c.textAlign = 'left';
  c.fillStyle = '#e8f4f8'; c.font = 'bold 16px system-ui';
  c.fillText('YOUR STANDING', px, my + 8);
  c.font = '13.5px system-ui'; c.fillStyle = '#cfe0e8';
  c.fillText(`Cash: $${G.cash}    Ammo: ${G.ammo}`, px, my + 32);
  c.fillText(`Runner: ${G.player.name}`, px, my + 52);
  c.fillText(`Garage: ${G.garageCar ? G.garageCar.modelId : 'empty'}`, px, my + 72);
  let yy = my + 102;
  c.fillStyle = '#ffd75e'; c.font = 'bold 13px system-ui';
  c.fillText('DISTRICT REPUTATION', px, yy); yy += 8;
  for (const d of DISTRICTS) {
    yy += 19;
    c.fillStyle = '#cfe0e8'; c.font = '12.5px system-ui';
    c.fillText(d.name, px, yy);
    c.fillStyle = '#3a4356'; c.fillRect(px + 118, yy - 10, 110, 9);
    c.fillStyle = '#ffd75e'; c.fillRect(px + 118, yy - 10, (G.rep[d.id] || 0) * 1.1, 9);
  }
  yy += 26;
  c.fillStyle = '#ffd75e'; c.font = 'bold 13px system-ui';
  c.fillText('STORY', px, yy); yy += 8;
  for (const m of MISSIONS) {
    yy += 18;
    const done = G.missionsDone.includes(m.id);
    c.fillStyle = done ? '#8dff9a' : '#8fa5b1'; c.font = '12.5px system-ui';
    c.fillText(`${done ? '✓' : '·'} ${m.title} — ${m.runner === 'any' ? 'both runners' : m.runner}`, px, yy);
  }
  yy += 30;
  c.fillStyle = '#9fb4c0'; c.font = '12px system-ui';
  c.fillText('● gold mission   ● cyan gig   ● blue police', px, yy);
  c.fillText('● green safehouse   ● you are the white dot', px, yy + 16);
  c.restore();
}
