// hud.js — everything drawn over the world: status bars, wanted stars,
// the speedometer, objective and prompt lines, the district banner, the
// phone toast, and the full-screen menus (title, pause, cards, shop,
// wasted / busted).

import { VIEW_W, VIEW_H, CONTROLS_TEXT, RUNNERS } from './config.js';
import { G, activeRunner, activeDef } from './state.js';
import { stars } from './police.js';
import { carSpeed } from './vehicles.js';
import { roundRect } from './vehicles.js';
import { SHOP_ITEMS } from './economy.js';
import { STATION_NAMES } from './audio.js';
import { hasSave } from './save.js';
import { wrapText } from './phone.js';

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(10,10,16,0.62)') {
  ctx.fillStyle = bg; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (frac > 0.01) { ctx.fillStyle = color; roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill(); }
}

export function drawHUD(ctx) {
  const r = activeRunner(), def = activeDef();
  // Top-left: who, health, armor, cash.
  ctx.fillStyle = 'rgba(10,10,18,0.55)'; roundRect(ctx, 16, 14, 232, 76, 10); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 15px system-ui';
  ctx.fillText(def.name.toUpperCase(), 28, 36);
  bar(ctx, 28, 44, 150, 10, r.hp / 100, r.hp > 30 ? '#53d769' : '#ff5d5d');
  bar(ctx, 28, 58, 150, 7, r.armor / 100, '#7fd4ff');
  ctx.fillStyle = '#7bf1a8'; ctx.font = 'bold 17px system-ui';
  ctx.fillText('$' + G.cash, 190, 62);
  ctx.fillStyle = '#c8cede'; ctx.font = '12px system-ui';
  if (!r.car) ctx.fillText(`🔫 ${r.ammo}`, 190, 80);
  // Top-right: wanted stars and the bust meter.
  const st = stars();
  ctx.font = '26px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < st ? '#ffd23f' : 'rgba(200,205,220,0.28)';
    ctx.fillText('★', VIEW_W - 22 - (4 - i) * 30, 42);
  }
  ctx.textAlign = 'left';
  if (G.wanted.bust > 0.03) {
    ctx.fillStyle = '#ff5d5d'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('BUSTED?', VIEW_W - 22, 66); ctx.textAlign = 'left';
    bar(ctx, VIEW_W - 172, 72, 150, 8, G.wanted.bust, '#ff5d5d');
  }
  if (G.muted) { ctx.fillStyle = '#8b93a7'; ctx.font = '12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('🔇 MUTED (N)', VIEW_W - 22, 96); ctx.textAlign = 'left'; }
  // District banner.
  if (G.bannerT > 0) {
    const a = Math.min(1, G.bannerT / 0.8);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,10,18,0.5)'; roundRect(ctx, VIEW_W / 2 - 170, 86, 340, 52, 12); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 25px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(G.district.toUpperCase(), VIEW_W / 2, 121);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  // Phone toast: the newest message, briefly.
  const last = G.messages[G.messages.length - 1];
  if (last && G.time - last.t < 4.5 && G.screen === 'play') {
    ctx.fillStyle = 'rgba(10,12,20,0.78)'; roundRect(ctx, VIEW_W / 2 - 250, 148, 500, 40, 10); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12.5px system-ui';
    ctx.fillText('📱 ' + last.from, VIEW_W / 2 - 236, 164);
    ctx.fillStyle = '#e6e9f2'; ctx.font = '12.5px system-ui';
    const txt = last.text.length > 58 ? last.text.slice(0, 58) + '…' : last.text;
    ctx.fillText(txt, VIEW_W / 2 - 236, 180);
  }
  // Bottom-right: speedometer in a car.
  if (r.car) {
    const kmh = Math.round(carSpeed(r.car) * 0.42);
    ctx.fillStyle = 'rgba(10,10,18,0.55)'; roundRect(ctx, VIEW_W - 218, VIEW_H - 96, 202, 80, 10); ctx.fill();
    ctx.fillStyle = '#f4f1e6'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(String(kmh), VIEW_W - 66, VIEW_H - 50);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#8b93a7';
    ctx.fillText('km/h', VIEW_W - 26, VIEW_H - 50);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8cede'; ctx.font = '12.5px system-ui';
    ctx.fillText(r.car.def.name + (G.radio ? ' · ♪ ' + STATION_NAMES[G.radio] : ''), VIEW_W - 204, VIEW_H - 68);
    bar(ctx, VIEW_W - 204, VIEW_H - 34, 150, 6, r.car.hp / r.car.maxHp, '#ffb703');
  }
  // Bottom-centre: objective, then the contextual prompt.
  if (G.objective) {
    ctx.font = 'bold 15px system-ui';
    const w = Math.min(760, ctx.measureText(G.objective).width + 40);
    ctx.fillStyle = 'rgba(10,10,18,0.62)'; roundRect(ctx, (VIEW_W - w) / 2, VIEW_H - 52, w, 34, 9); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center';
    ctx.fillText('◎ ' + G.objective, VIEW_W / 2, VIEW_H - 29);
    ctx.textAlign = 'left';
  }
  if (G.prompt) {
    ctx.font = 'bold 14.5px system-ui';
    const w = ctx.measureText(G.prompt).width + 34;
    ctx.fillStyle = 'rgba(255,210,63,0.92)'; roundRect(ctx, (VIEW_W - w) / 2, VIEW_H - 92, w, 30, 9); ctx.fill();
    ctx.fillStyle = '#191408'; ctx.textAlign = 'center';
    ctx.fillText(G.prompt, VIEW_W / 2, VIEW_H - 71);
    ctx.textAlign = 'left';
  }
  // World-space floaters (+$400 and friends), projected to the screen.
  ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - G.cam.x, f.y - G.cam.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

export function drawTitle(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, 'rgba(24,8,38,0.42)'); grad.addColorStop(1, 'rgba(24,8,38,0.78)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  const titleGrad = ctx.createLinearGradient(0, 90, 0, 190);
  titleGrad.addColorStop(0, '#ffe259'); titleGrad.addColorStop(0.55, '#ffa751'); titleGrad.addColorStop(1, '#ff5e8a');
  ctx.fillStyle = titleGrad;
  ctx.font = '900 96px system-ui';
  ctx.fillText('AZUL HEAT', VIEW_W / 2, 178);
  ctx.fillStyle = '#f4f1e6'; ctx.font = 'bold 25px system-ui';
  ctx.fillText('— T W O   R U N N E R S —', VIEW_W / 2, 222);
  ctx.fillStyle = '#c8cede'; ctx.font = '16px system-ui';
  ctx.fillText('An open-world crime story in the sunset city of Bahía Azul.', VIEW_W / 2, 254);
  ctx.fillText('Steal cars. Run jobs for Tía Carmen, El Contador and DJ Prisma. Outrun the heat — together.', VIEW_W / 2, 278);
  // Runner cards.
  for (const [i, id] of ['lucia', 'marco'].entries()) {
    const d = RUNNERS[id], x = VIEW_W / 2 - 330 + i * 340, y = 308;
    ctx.fillStyle = 'rgba(14,14,24,0.78)'; roundRect(ctx, x, y, 320, 118, 14); ctx.fill();
    ctx.strokeStyle = d.accent; ctx.lineWidth = 2; roundRect(ctx, x, y, 320, 118, 14); ctx.stroke();
    ctx.fillStyle = d.top; roundRect(ctx, x + 16, y + 16, 46, 46, 10); ctx.fill();
    ctx.fillStyle = d.skin; ctx.beginPath(); ctx.arc(x + 39, y + 34, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(d.name, x + 76, y + 40);
    ctx.fillStyle = '#c8cede'; ctx.font = '13px system-ui';
    wrapText(ctx, d.role, x + 76, y + 62, 228, 17, 2);
    ctx.fillStyle = '#8b93a7';
    ctx.fillText(id === 'lucia' ? 'Handling ★★★★★ · Durability ★★★' : 'Handling ★★★ · Durability ★★★★★', x + 16, y + 98);
  }
  // Menu.
  const items = hasSave() ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];
  ctx.font = 'bold 21px system-ui';
  items.forEach((label, i) => {
    const y = 486 + i * 40, sel = G.titleSel === i;
    if (sel) { ctx.fillStyle = 'rgba(255,210,63,0.9)'; roundRect(ctx, VIEW_W / 2 - 130, y - 27, 260, 36, 9); ctx.fill(); }
    ctx.fillStyle = sel ? '#191408' : '#f4f1e6';
    ctx.fillText((sel ? '▶ ' : '') + label, VIEW_W / 2, y);
  });
  // Controls.
  ctx.fillStyle = 'rgba(14,14,24,0.66)'; roundRect(ctx, VIEW_W / 2 - 330, 580, 660, 168, 14); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 14px system-ui';
  ctx.fillText('CONTROLS', VIEW_W / 2, 606);
  ctx.fillStyle = '#c8cede'; ctx.font = '13.5px system-ui';
  CONTROLS_TEXT.forEach((line, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    ctx.textAlign = col ? 'left' : 'right';
    ctx.fillText(line, VIEW_W / 2 + (col ? 14 : -14), 634 + row * 26);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b93a7'; ctx.font = '13px system-ui';
  ctx.fillText('Enter / Click — start · ↑ ↓ — choose', VIEW_W / 2, 776);
  ctx.textAlign = 'left';
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,8,18,0.66)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f'; ctx.font = '900 52px system-ui';
  ctx.fillText('PAUSED', VIEW_W / 2, 240);
  ctx.fillStyle = '#c8cede'; ctx.font = '15px system-ui';
  CONTROLS_TEXT.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 26));
  ctx.fillStyle = '#8b93a7';
  ctx.fillText('P / Esc — back to the streets · progress saves at the safehouse', VIEW_W / 2, 300 + CONTROLS_TEXT.length * 26 + 16);
  ctx.textAlign = 'left';
}

// Split a card's lines into wrapped rows at the card's text width.
function cardRows(ctx, lines, maxW) {
  const rows = [];
  for (const line of lines) {
    let cur = '';
    for (const word of line.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && cur) { rows.push(cur); cur = word; }
      else cur = test;
    }
    if (cur) rows.push(cur);
    rows.push(''); // breathing room between paragraphs
  }
  return rows;
}

export function drawCard(ctx) {
  const card = G.card;
  if (!card) return;
  ctx.fillStyle = 'rgba(8,8,16,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 620;
  ctx.font = '15.5px system-ui';
  const rows = cardRows(ctx, card.lines, w - 56);
  const h = 128 + rows.length * 22, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#14161f'; roundRect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = card.kind === 'failed' ? '#ff5d5d' : '#ffd23f'; ctx.lineWidth = 2.4;
  roundRect(ctx, x, y, w, h, 16); ctx.stroke();
  ctx.fillStyle = card.kind === 'failed' ? '#ff5d5d' : '#ffd23f';
  ctx.font = 'bold 25px system-ui';
  ctx.fillText(card.title, x + 28, y + 46);
  ctx.fillStyle = '#e6e9f2'; ctx.font = '15.5px system-ui';
  rows.forEach((row, i) => { if (row) ctx.fillText(row, x + 28, y + 84 + i * 22); });
  ctx.fillStyle = '#8b93a7'; ctx.font = '13.5px system-ui';
  ctx.fillText(card.kind === 'offer' ? 'E / Click — take the job · Esc — not now' : 'E / Click / Esc — continue', x + 28, y + h - 18);
}

export function drawShop(ctx) {
  ctx.fillStyle = 'rgba(8,8,16,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 520, h = 330, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#14161f'; roundRect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.4; roundRect(ctx, x, y, w, h, 16); ctx.stroke();
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 24px system-ui';
  ctx.fillText('AMMU-NACIÓN', x + 26, y + 44);
  ctx.fillStyle = '#7bf1a8'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'right';
  ctx.fillText('$' + G.cash, x + w - 26, y + 44); ctx.textAlign = 'left';
  SHOP_ITEMS.forEach((item, i) => {
    const iy = y + 78 + i * 62;
    ctx.fillStyle = '#1d2231'; roundRect(ctx, x + 20, iy, w - 40, 52, 10); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 16px system-ui';
    ctx.fillText(`${i + 1}. ${item.name}`, x + 36, iy + 22);
    ctx.fillStyle = '#8b93a7'; ctx.font = '13px system-ui';
    ctx.fillText(item.desc, x + 36, iy + 41);
    ctx.fillStyle = '#7bf1a8'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('$' + item.price, x + w - 36, iy + 30); ctx.textAlign = 'left';
  });
  const r = activeRunner();
  ctx.fillStyle = '#c8cede'; ctx.font = '13.5px system-ui';
  ctx.fillText(`Health ${Math.round(r.hp)} · Armor ${Math.round(r.armor)} · Ammo ${r.ammo}`, x + 26, y + h - 44);
  ctx.fillStyle = '#8b93a7';
  ctx.fillText('Press 1 / 2 / 3 to buy · E / Esc — leave', x + 26, y + h - 18);
}

export function drawEndScreen(ctx) {
  const wasted = G.screen === 'wasted';
  ctx.fillStyle = wasted ? 'rgba(60,4,10,0.55)' : 'rgba(8,14,40,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = wasted ? '#ff5d5d' : '#7fd4ff';
  ctx.font = '900 84px system-ui';
  ctx.fillText(wasted ? 'WASTED' : 'BUSTED', VIEW_W / 2, VIEW_H / 2 - 20);
  ctx.fillStyle = '#f4f1e6'; ctx.font = '17px system-ui';
  ctx.fillText(wasted ? 'The hospital patched you up — for a price.' : 'The Bahía PD let you go — for a price.', VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.fillStyle = '#8b93a7'; ctx.font = '14px system-ui';
  ctx.fillText('Enter — back to the streets', VIEW_W / 2, VIEW_H / 2 + 58);
  ctx.textAlign = 'left';
}
