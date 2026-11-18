'use strict';
/* Azul Heat — the in-game phone. Contacts send the story to you: every
   mission opens with their messages, and paydays land here too. T opens
   it; the toast at the top of the screen is its lock-screen ping. */
AH.Phone = (function () {
  const CONTACTS = [
    { name: 'Tía Carmen', color: '#ff9f1c', blurb: 'Bakery · family · pastelitos' },
    { name: 'El Contador', color: '#37e0ff', blurb: 'Accounts · ledgers · quiet work' },
    { name: 'DJ Prisma', color: '#ff4fd8', blurb: 'Club Prisma · the night shift' },
  ];

  function addMessage(from, text) {
    const G = AH.G;
    G.messages.push({ from, text, t: G.time });
    if (G.messages.length > 40) G.messages.shift();
    if (G.screen === 'play' && G.overlay !== 'phone') AH.toast('📱 ' + from + ': ' + text.slice(0, 44) + '…');
    AH.Audio.blip(1180);
  }

  function draw(ctx) {
    const G = AH.G, W = AH.CFG.viewW, H = AH.CFG.viewH;
    ctx.fillStyle = 'rgba(10,6,18,0.55)';
    ctx.fillRect(0, 0, W, H);
    const pw = 380, ph = 560, px = W - pw - 46, py = (H - ph) / 2;
    // handset body
    ctx.fillStyle = '#14101f';
    roundRect(ctx, px, py, pw, ph, 30); ctx.fill();
    ctx.strokeStyle = '#3a3350'; ctx.lineWidth = 2; roundRect(ctx, px, py, pw, ph, 30); ctx.stroke();
    ctx.fillStyle = '#1d1830';
    roundRect(ctx, px + 12, py + 34, pw - 24, ph - 90, 16); ctx.fill();
    ctx.fillStyle = '#f5f0e6';
    ctx.font = 'bold 19px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('📱 AzulPhone', px + 24, py + 26 + 34 - 34 + 24);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#9d94b8';
    ctx.fillText('Bahía Azul · golden hour · ' + CONTACTS.length + ' contacts', px + 24, py + 78);
    // messages, newest at the bottom like a real chat
    let y = py + 104;
    const msgs = G.messages.slice(-9);
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 16, py + 92, pw - 32, ph - 160); ctx.clip();
    for (const m of msgs) {
      const c = CONTACTS.find(k => k.name === m.from);
      ctx.fillStyle = c ? c.color : '#ffd23f';
      ctx.font = 'bold 12.5px system-ui, sans-serif';
      ctx.fillText(m.from, px + 26, y);
      ctx.fillStyle = '#e8e2f2';
      ctx.font = '13.5px system-ui, sans-serif';
      y = wrapText(ctx, m.text, px + 26, y + 17, pw - 56, 17) + 14;
      if (y > py + ph - 80) break;
    }
    ctx.restore();
    ctx.fillStyle = '#9d94b8'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('T / Esc — put the phone away', px + pw / 2, py + ph - 22);
    ctx.textAlign = 'left';
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = test;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { CONTACTS, addMessage, draw, roundRect };
})();
