// Azul Heat — phone.js: the in-game phone. Contacts send their mission offers and
// reactions here; a toast slides in when a message lands, and T opens the phone to
// read the thread, see your contacts and check your standing in the city.

import { G } from './state.js';
import { CONTACTS } from './missions.js';
import { repTotal } from './economy.js';
import { sfx } from './audio.js';

export const phoneLog = [
  { from: 'Tía Carmen', text: 'Lucía arrives Thursday. Marco — keep the garage ready. — C.' },
];

export function sendMessage(from, text) {
  phoneLog.push({ from, text });
  if (phoneLog.length > 14) phoneLog.shift();
  G.phoneMsg = { from, text, until: G.time + 4.6 };
  sfx.pickup();
}

export function drawPhone(c, w, h) {
  c.save();
  c.fillStyle = 'rgba(10,6,16,0.55)';
  c.fillRect(0, 0, w, h);
  const pw = 342, ph = 560, x = w - pw - 26, y = (h - ph) / 2;
  c.fillStyle = '#14161f';
  c.beginPath(); c.roundRect(x, y, pw, ph, 26); c.fill();
  c.fillStyle = '#1f2432';
  c.beginPath(); c.roundRect(x + 8, y + 8, pw - 16, ph - 16, 20); c.fill();
  c.fillStyle = '#e8f4f8'; c.font = 'bold 17px system-ui'; c.textAlign = 'left';
  c.fillText('📱  Bahía Azul — Messages', x + 22, y + 38);
  c.font = '12px system-ui'; c.fillStyle = '#9fb4c0';
  c.fillText(`Cash $${G.cash} · Rep ${repTotal()} · Missions ${G.missionsDone.length}/6`, x + 22, y + 58);
  let cy = y + 84;
  for (const msg of phoneLog.slice(-7)) {
    c.fillStyle = '#ffd75e'; c.font = 'bold 12.5px system-ui';
    c.fillText(msg.from, x + 22, cy);
    c.fillStyle = '#dfe9ee'; c.font = '12.5px system-ui';
    cy += 16;
    for (const line of wrapText(c, msg.text, pw - 44)) { c.fillText(line, x + 22, cy); cy += 15; }
    cy += 10;
    if (cy > y + ph - 120) break;
  }
  c.fillStyle = '#9fb4c0'; c.font = 'bold 12px system-ui';
  c.fillText('CONTACTS', x + 22, y + ph - 92);
  c.font = '12.5px system-ui'; c.fillStyle = '#dfe9ee';
  Object.values(CONTACTS).forEach((ct, i) => {
    c.fillText(`● ${ct.name} — ${['the Marina', 'Plaza Vieja', 'the Neon Strip'][i]}`, x + 22, y + ph - 70 + i * 17);
  });
  c.fillStyle = '#7e93a0'; c.font = '11.5px system-ui';
  c.fillText('T or Esc — put the phone away', x + 22, y + ph - 14);
  c.restore();
}

export function wrapText(c, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
