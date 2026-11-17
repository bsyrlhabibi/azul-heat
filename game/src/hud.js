// Azul Heat — hud.js: everything drawn over the world. Wanted stars and cash top
// right, health and armour top left, the minimap bottom left, a speedometer when
// driving, the objective line under the top centre, interaction prompts, district
// banners, phone toasts and the bust meter when the police have you cornered.

import { G } from './state.js';
import { drawMinimap } from './minimap.js';
import { wrapText } from './phone.js';

const STATIONS = ['radio off', 'OLA FM · synthwave', 'SOL LATINO · reguetón', 'MAR CHILL · lofi'];

export function drawHud(c, w, h) {
  const p = G.player;
  // Objective, top centre.
  if (G.objective) {
    c.save();
    c.font = 'bold 14.5px system-ui';
    const tw = c.measureText(G.objective).width + 30;
    c.fillStyle = 'rgba(12,8,20,0.66)';
    c.beginPath(); c.roundRect((w - tw) / 2, 12, tw, 30, 8); c.fill();
    c.fillStyle = '#ffd75e'; c.textAlign = 'center';
    c.fillText(G.objective, w / 2, 33);
    c.restore();
  }
  // Health and armour, top left.
  c.save();
  c.fillStyle = 'rgba(12,8,20,0.55)';
  c.beginPath(); c.roundRect(14, 12, 218, 52, 8); c.fill();
  c.fillStyle = '#fff'; c.font = 'bold 12px system-ui'; c.textAlign = 'left';
  c.fillText(p.name, 24, 29);
  bar(c, 24, 36, 130, 9, p.hp / 100, '#e74c3c');
  bar(c, 24, 48, 130, 6, p.armor / 100, '#7fd4e8');
  c.fillStyle = '#9fe870'; c.font = 'bold 15px system-ui';
  c.fillText(`$${G.cash}`, 162, 47);
  c.fillStyle = '#cfe0e8'; c.font = '11px system-ui';
  c.fillText(p.inCar ? '' : `🔫 ${G.ammo}`, 162, 60);
  c.restore();
  // Wanted stars, top right.
  c.save();
  c.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    const on = i < G.police.stars;
    c.font = '26px system-ui';
    c.fillStyle = on ? (Math.floor(G.time * 4) % 2 && i === G.police.stars - 1 ? '#fff' : '#ffd75e') : 'rgba(255,255,255,0.25)';
    c.fillText('★', w - 18 - (4 - i) * 30, 38);
  }
  c.font = '11.5px system-ui'; c.fillStyle = '#9fb4c0';
  c.fillText(G.muted ? '🔇 muted (click to unmute)' : '🔊 sound', w - 18, 58);
  c.restore();
  drawMinimap(c, 106, h - 106, 88);
  // Driving instruments, bottom right.
  if (p.inCar) {
    c.save();
    c.fillStyle = 'rgba(12,8,20,0.55)';
    c.beginPath(); c.roundRect(w - 196, h - 92, 182, 78, 10); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 30px system-ui'; c.textAlign = 'right';
    c.fillText(`${Math.round(Math.abs(p.inCar.speed) * 0.42)}`, w - 66, h - 48);
    c.font = '11px system-ui'; c.fillStyle = '#9fb4c0';
    c.fillText('km/h', w - 24, h - 48);
    c.textAlign = 'left';
    c.fillText(p.inCar.model.name, w - 184, h - 62);
    bar(c, w - 184, h - 40, 120, 7, p.inCar.hp / p.inCar.model.hp, '#f39c12');
    c.fillStyle = '#cfe0e8';
    c.fillText(`📻 ${STATIONS[G.radio]}`, w - 184, h - 22);
    c.restore();
  }
  // Bust meter.
  if (G.police.bust > 0.02) {
    c.save();
    c.fillStyle = 'rgba(12,8,20,0.6)';
    c.beginPath(); c.roundRect(w / 2 - 110, 56, 220, 26, 8); c.fill();
    c.fillStyle = '#ff5252'; c.font = 'bold 13px system-ui'; c.textAlign = 'center';
    c.fillText('BUSTED?', w / 2 - 66, 73);
    bar(c, w / 2 - 6, 63, 96, 11, G.police.bust, '#ff5252');
    c.restore();
  }
  // Interaction prompt, bottom centre.
  if (G.prompt) {
    c.save();
    c.font = 'bold 14px system-ui';
    const tw = c.measureText(G.prompt).width + 30;
    c.fillStyle = 'rgba(12,8,20,0.72)';
    c.beginPath(); c.roundRect((w - tw) / 2, h - 52, tw, 32, 9); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.fillText(G.prompt, w / 2, h - 31);
    c.restore();
  }
  // Phone toast.
  if (G.phoneMsg && G.time < G.phoneMsg.until) {
    c.save();
    const tw = 300, th = 64, x = w - tw - 16, y = 74;
    c.fillStyle = 'rgba(16,20,30,0.9)';
    c.beginPath(); c.roundRect(x, y, tw, th, 12); c.fill();
    c.strokeStyle = '#ffd75e'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#ffd75e'; c.font = 'bold 12.5px system-ui'; c.textAlign = 'left';
    c.fillText(`📱 ${G.phoneMsg.from}`, x + 13, y + 21);
    c.fillStyle = '#dfe9ee'; c.font = '12px system-ui';
    wrapText(c, G.phoneMsg.text, tw - 26).slice(0, 2).forEach((line, i) => c.fillText(line, x + 13, y + 39 + i * 14));
    c.restore();
  }
  // Banner (district names, stored cars, gig results).
  if (G.banner && G.time < G.banner.until) {
    const f = Math.max(0, Math.min(1, (G.banner.until - G.time) / 0.4));
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, f));
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    c.font = 'bold 40px system-ui';
    c.shadowColor = 'rgba(255,80,160,0.8)'; c.shadowBlur = 22;
    c.fillText(G.banner.title, w / 2, h * 0.30);
    c.shadowBlur = 0;
    c.font = '15px system-ui'; c.fillStyle = '#ffe9a8';
    c.fillText(G.banner.sub || '', w / 2, h * 0.30 + 28);
    c.restore();
  }
  // Fresh damage flash.
  if (G.time - p.lastHurt < 0.22) {
    c.fillStyle = `rgba(220,30,40,${0.20 * (1 - (G.time - p.lastHurt) / 0.22)})`;
    c.fillRect(0, 0, w, h);
  }
}

function bar(c, x, y, w, hgt, frac, color) {
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(x, y, w, hgt);
  c.fillStyle = color;
  c.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, hgt);
}
