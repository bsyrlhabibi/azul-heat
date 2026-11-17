// minimap.js — the circular HUD minimap (roads, water, blips for police,
// contacts, shops and the objective) and the full city map screen with
// district reputation and story progress.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, WATER_X, ROADS_V, ROADS_H, DISTRICTS, PLACES, CONTACTS } from './config.js';
import { G, activeRunner } from './state.js';
import { MISSIONS } from './missions.js';
import { roundRect } from './vehicles.js';

function blip(ctx, x, y, color, r = 4) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(8,8,14,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
}

export function drawMinimap(ctx) {
  const r = activeRunner();
  const cx = 116, cy = VIEW_H - 116, rad = 102;
  const scale = rad / 560; // 560 world units from centre to edge
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#20303a'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  const px = (wx) => cx + (wx - r.x) * scale, py = (wy) => cy + (wy - r.y) * scale;
  for (const d of DISTRICTS) { ctx.fillStyle = d.ground; ctx.fillRect(px(d.x), py(d.y), d.w * scale, d.h * scale); }
  ctx.fillStyle = '#11697a'; ctx.fillRect(px(0), py(0), WATER_X * scale, WORLD_H * scale);
  ctx.strokeStyle = 'rgba(20,20,28,0.85)'; ctx.lineWidth = 7;
  for (const rx of ROADS_V) { ctx.beginPath(); ctx.moveTo(px(rx), py(0)); ctx.lineTo(px(rx), py(WORLD_H)); ctx.stroke(); }
  for (const ry of ROADS_H) { ctx.beginPath(); ctx.moveTo(px(0), py(ry)); ctx.lineTo(px(WORLD_W), py(ry)); ctx.stroke(); }
  for (const c of CONTACTS) { const p = PLACES[c.place]; blip(ctx, px(p.x), py(p.y), '#ffd23f', 4.4); }
  for (const key of ['gunshopA', 'gunshopB']) blip(ctx, px(PLACES[key].x), py(PLACES[key].y), '#7bf1a8', 3.6);
  blip(ctx, px(PLACES.safehouse.x), py(PLACES.safehouse.y), '#f4f1e6', 3.6);
  for (const u of G.police.units) blip(ctx, px(u.x), py(u.y), '#5b8cff', 3.8);
  if (G.marker) {
    const pulse = 4.6 + Math.sin(G.time * 5) * 1.4;
    blip(ctx, px(G.marker.x), py(G.marker.y), G.marker.color, pulse);
  }
  const other = G.runners[G.active === 'lucia' ? 'marco' : 'lucia'];
  blip(ctx, px(other.x), py(other.y), '#c8cede', 3.4);
  ctx.restore();
  // Player arrow, pointing the way the runner (or their car) faces.
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(r.angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6.4, 7); ctx.lineTo(0, 3.4); ctx.lineTo(-6.4, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(12,10,18,0.85)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, rad + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,63,0.5)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, rad + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f4f1e6'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - rad - 8);
  ctx.textAlign = 'left';
}

export function drawMapScreen(ctx) {
  ctx.fillStyle = 'rgba(10,9,18,0.88)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const mw = 880, mh = 660, mx = 34, my = 84;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  const X = (wx) => mx + wx * sx, Y = (wy) => my + wy * sy;
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 30px system-ui';
  ctx.fillText('BAHÍA AZUL', 34, 52);
  ctx.fillStyle = '#8b93a7'; ctx.font = '15px system-ui';
  ctx.fillText('One city, two runners. Gold is work, blue is trouble.', 300, 52);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground; ctx.fillRect(X(d.x), Y(d.y), d.w * sx, d.h * sy);
    ctx.strokeStyle = 'rgba(10,10,16,0.5)'; ctx.strokeRect(X(d.x), Y(d.y), d.w * sx, d.h * sy);
    ctx.fillStyle = 'rgba(255,246,220,0.92)'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(d.name.toUpperCase(), X(d.x + d.w / 2), Y(d.y + d.h / 2));
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#11697a'; ctx.fillRect(X(0), Y(0), WATER_X * sx, WORLD_H * sy);
  ctx.strokeStyle = '#2c2f36'; ctx.lineWidth = 5;
  for (const rx of ROADS_V) { ctx.beginPath(); ctx.moveTo(X(rx), Y(0)); ctx.lineTo(X(rx), Y(WORLD_H)); ctx.stroke(); }
  for (const ry of ROADS_H) { ctx.beginPath(); ctx.moveTo(X(0), Y(ry)); ctx.lineTo(X(WORLD_W), Y(ry)); ctx.stroke(); }
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,183,3,0.6)';
  for (const rx of ROADS_V) { ctx.beginPath(); ctx.moveTo(X(rx), Y(0)); ctx.lineTo(X(rx), Y(WORLD_H)); ctx.stroke(); }
  for (const c of CONTACTS) { const p = PLACES[c.place]; blip(ctx, X(p.x), Y(p.y), '#ffd23f', 5.4); }
  for (const key of ['gunshopA', 'gunshopB', 'safehouse', 'hospital', 'raceStart']) blip(ctx, X(PLACES[key].x), Y(PLACES[key].y), '#7bf1a8', 4.2);
  for (const u of G.police.units) blip(ctx, X(u.x), Y(u.y), '#5b8cff', 4.4);
  const r = activeRunner();
  blip(ctx, X(r.x), Y(r.y), '#ffffff', 6);
  if (G.marker) blip(ctx, X(G.marker.x), Y(G.marker.y), G.marker.color, 6 + Math.sin(G.time * 5) * 1.6);
  // Side panel: reputation and the story so far.
  const px = 946, pw = 300;
  ctx.fillStyle = '#171a26'; roundRect(ctx, px, 84, pw, 660, 14); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px system-ui';
  ctx.fillText('REPUTATION', px + 18, 118);
  let ly = 146;
  for (const d of DISTRICTS) {
    const rep = G.rep[d.name] || 0;
    ctx.fillStyle = '#c8cede'; ctx.font = '13.5px system-ui';
    ctx.fillText(d.name, px + 18, ly);
    ctx.fillStyle = '#2c3040'; roundRect(ctx, px + 18, ly + 6, pw - 36, 9, 4); ctx.fill();
    ctx.fillStyle = '#ffb703'; roundRect(ctx, px + 18, ly + 6, Math.max(4, (pw - 36) * rep / 100), 9, 4); ctx.fill();
    ly += 40;
  }
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px system-ui';
  ctx.fillText('THE STORY', px + 18, ly + 8);
  ly += 34;
  for (const m of MISSIONS) {
    const done = G.missionsDone.includes(m.id);
    ctx.fillStyle = done ? '#7bf1a8' : '#8b93a7'; ctx.font = '14px system-ui';
    ctx.fillText(`${done ? '✓' : '○'} ${m.title}`, px + 18, ly);
    ctx.fillStyle = '#5f6577'; ctx.font = '12px system-ui';
    ctx.fillText(m.who === 'both' ? 'Lucía & Marco' : (m.who === 'lucia' ? 'Lucía' : 'Marco'), px + 200, ly);
    ly += 24;
  }
  ctx.fillStyle = '#c8cede'; ctx.font = '13.5px system-ui';
  ctx.fillText(`Cash $${G.cash} · Earned $${G.stats.earned}`, px + 18, ly + 12);
  ctx.fillText(`Cars stolen ${G.stats.carsStolen} · Shots ${G.stats.shots}`, px + 18, ly + 34);
  ctx.fillText(G.garage ? `Garage: ${G.garage.model}` : 'Garage: empty', px + 18, ly + 56);
  ctx.fillStyle = '#8b93a7'; ctx.font = '13px system-ui';
  ctx.fillText('M / Esc — back to the streets', px + 18, 722);
}
