// phone.js — the in-game phone: a message feed from contacts and the
// city, opened with T. Messages arrive from story.js, gigs and police.

import { VIEW_W, VIEW_H } from './config.js';
import { G } from './state.js';
import { roundRect } from './vehicles.js';

export function drawPhone(ctx) {
  const w = 400, h = 560, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(8,8,16,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#12141f';
  roundRect(ctx, x, y, w, h, 26); ctx.fill();
  ctx.strokeStyle = '#3d4457'; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 26); ctx.stroke();
  ctx.fillStyle = '#0a0c12'; roundRect(ctx, x + 130, y + 10, 140, 18, 9); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 21px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('📱 Bahía Phone', x + 24, y + 62);
  ctx.fillStyle = '#8b93a7'; ctx.font = '13px system-ui';
  ctx.fillText(G.runners[G.active].name + ' · $' + G.cash, x + 24, y + 86);
  const msgs = G.messages.slice(-9);
  let cy = y + 116;
  if (!msgs.length) {
    ctx.fillStyle = '#c8cede'; ctx.font = '15px system-ui';
    ctx.fillText('No messages yet. Gold markers on the map mean work.', x + 24, cy);
  }
  for (const m of msgs) {
    ctx.fillStyle = '#1d2231'; roundRect(ctx, x + 16, cy - 16, w - 32, 52, 10); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(m.from, x + 26, cy + 2);
    ctx.fillStyle = '#e6e9f2'; ctx.font = '13.5px system-ui';
    wrapText(ctx, m.text, x + 26, cy + 20, w - 52, 16, 2);
    cy += 60;
  }
  ctx.fillStyle = '#8b93a7'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('T / Esc — put the phone away', x + w / 2, y + h - 18);
  ctx.textAlign = 'left';
}

export function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++; line = word;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}
