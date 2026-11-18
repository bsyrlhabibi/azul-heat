'use strict';
/* Azul Heat — the circular minimap (HUD) and the full city map (M).
   The minimap is a radar: roads, water and blips around the player.
   The full map is the pause-and-plan screen: districts, named places,
   safehouses and your progression across Bahía Azul. */
AH.Minimap = (function () {
  const U = AH.U, C = AH.CFG;

  function blip(ctx, x, y, color, size, pulse) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * (pulse ? 1 + Math.sin(AH.G.time * 6) * 0.22 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,8,20,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  function draw(ctx) {
    const G = AH.G, P = G.player;
    if (!P) return;
    const cx = 108, cy = C.viewH - 108, r = 86, range = 1500, k = r / range;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#20303a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const wx = x => cx + (x - P.x) * k, wy = y => cy + (y - P.y) * k;
    // land + sea
    ctx.fillStyle = '#3d4a3a'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(wx(C.seaX), cy - r, (C.worldW - C.seaX) * k, r * 2);
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(wx(C.waterX), cy - r, (C.worldW - C.waterX) * k, r * 2);
    // roads
    ctx.strokeStyle = '#585663'; ctx.lineWidth = Math.max(2, C.roadW * k);
    for (const rx of C.vRoads) { ctx.beginPath(); ctx.moveTo(wx(rx), cy - r); ctx.lineTo(wx(rx), cy + r); ctx.stroke(); }
    for (const ry of C.hRoads) { ctx.beginPath(); ctx.moveTo(cx - r, wy(ry)); ctx.lineTo(cx + r, wy(ry)); ctx.stroke(); }
    // blips
    for (const key of Object.keys(AH.SAFEHOUSE_SPOTS)) {
      const s = AH.SAFEHOUSE_SPOTS[key];
      if (Math.abs(s.x - P.x) < range && Math.abs(s.y - P.y) < range)
        blip(ctx, wx(s.x), wy(s.y), G.safehouses[key] ? '#8dff57' : '#3f9e4d', 4, false);
    }
    for (const c of G.cars) if (c.mode === 'police' && Math.abs(c.x - P.x) < range && Math.abs(c.y - P.y) < range)
      blip(ctx, wx(c.x), wy(c.y), Math.sin(G.time * 7) > 0 ? '#ff4040' : '#37a0ff', 3.6, false);
    if (G.partner && Math.abs(G.partner.x - P.x) < range) blip(ctx, wx(G.partner.x), wy(G.partner.y), '#f5f0e6', 3.4, false);
    const obj = AH.Story.objective();
    if (obj) {
      const dx = obj.x - P.x, dy = obj.y - P.y, d = Math.hypot(dx, dy);
      if (d < range) blip(ctx, wx(obj.x), wy(obj.y), '#ffd23f', 5, true);
      else blip(ctx, cx + (dx / d) * (r - 10), cy + (dy / d) * (r - 10), '#ffd23f', 5, true);
    }
    ctx.restore();
    // player arrow + frame
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(P.ang);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -5.4); ctx.lineTo(-6, 5.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(245,240,230,0.85)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - r - 5);
    ctx.textAlign = 'left';
  }

  function drawMap(ctx) {
    const G = AH.G, W = C.viewW, H = C.viewH;
    ctx.fillStyle = '#171226'; ctx.fillRect(0, 0, W, H);
    const mw = 880, mh = 660, mx = 36, my = 70, k = Math.min(mw / C.worldW, mh / C.worldH);
    ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('BAHÍA AZUL', mx, 44);
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#9d94b8';
    ctx.fillText('Six districts, one sunset. M / Esc — back to the streets', mx + 190, 44);
    // districts (their name + rep rects are recorded so the place
    // labels below can steer clear of them)
    const taken = [];
    for (let i = 0; i < AH.DISTRICTS.length; i++) {
      const d = AH.DISTRICTS[i];
      ctx.fillStyle = d.wall[0] + '55'; ctx.fillStyle = shade(d.ground, 0.9);
      ctx.fillRect(mx + d.x * k, my + d.y * k, d.w * k, d.h * k);
      const dcx = mx + (d.x + d.w / 2) * k, dcy = my + (d.y + d.h / 2) * k;
      ctx.fillStyle = 'rgba(245,240,230,0.92)';
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
      const nameUp = d.name.toUpperCase();
      taken.push({ x: dcx - ctx.measureText(nameUp).width / 2 - 3, y: dcy - 13, w: ctx.measureText(nameUp).width + 6, h: 15 });
      ctx.fillText(nameUp, dcx, dcy);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(245,240,230,0.75)';
      const repTxt = 'rep ' + Math.round(G.rep[i]) + '%';
      taken.push({ x: dcx - ctx.measureText(repTxt).width / 2 - 3, y: dcy + 6, w: ctx.measureText(repTxt).width + 6, h: 13 });
      ctx.fillText(repTxt, dcx, dcy + 16);
    }
    ctx.textAlign = 'left';
    // sea
    ctx.fillStyle = '#2e7f9e'; ctx.fillRect(mx + C.waterX * k, my, (C.worldW - C.waterX) * k, C.worldH * k);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(mx + C.seaX * k, my, (C.waterX - C.seaX) * k, C.worldH * k);
    // roads
    ctx.strokeStyle = 'rgba(30,28,40,0.65)'; ctx.lineWidth = Math.max(2, C.roadW * k);
    for (const rx of C.vRoads) { ctx.beginPath(); ctx.moveTo(mx + rx * k, my); ctx.lineTo(mx + rx * k, my + C.worldH * k); ctx.stroke(); }
    for (const ry of C.hRoads) { ctx.beginPath(); ctx.moveTo(mx, my + ry * k); ctx.lineTo(mx + C.seaX * k, my + ry * k); ctx.stroke(); }
    // named places + safehouses — each label takes the first anchor
    // (right, left, below, above) that clears every district name,
    // rep line and label already placed, on a soft dark backing
    ctx.font = '10.5px system-ui, sans-serif';
    for (const key of Object.keys(AH.PLACES)) {
      const p = AH.PLACES[key];
      const bx = mx + p.x * k, by = my + p.y * k;
      blip(ctx, bx, by, '#ffd23f', 3.4, false);
      const lw = ctx.measureText(p.label).width;
      const anchors = [
        { x: bx + 7, y: by + 3, align: 'left' },
        { x: bx - 7, y: by + 3, align: 'right' },
        { x: bx + 7, y: by + 15, align: 'left' },
        { x: bx + 7, y: by - 9, align: 'left' },
        { x: bx - 7, y: by + 15, align: 'right' },
        { x: bx - 7, y: by - 9, align: 'right' },
      ];
      let spot = null;
      for (const a of anchors) {
        const rect = { x: (a.align === 'left' ? a.x : a.x - lw) - 2, y: a.y - 9, w: lw + 4, h: 12 };
        if (rect.x < mx || rect.x + rect.w > mx + mw) continue;
        if (taken.some(t => rect.x < t.x + t.w && rect.x + rect.w > t.x && rect.y < t.y + t.h && rect.y + rect.h > t.y)) continue;
        spot = { a, rect }; break;
      }
      if (!spot) spot = { a: anchors[0], rect: { x: bx + 5, y: by - 6, w: lw + 4, h: 12 } };
      taken.push(spot.rect);
      ctx.fillStyle = 'rgba(13,10,24,0.55)';
      ctx.fillRect(spot.rect.x, spot.rect.y, spot.rect.w, spot.rect.h);
      ctx.fillStyle = 'rgba(245,240,230,0.92)';
      ctx.textAlign = spot.a.align;
      ctx.fillText(p.label, spot.a.x, spot.a.y);
      ctx.textAlign = 'left';
    }
    for (const key of Object.keys(AH.SAFEHOUSE_SPOTS)) {
      const s = AH.SAFEHOUSE_SPOTS[key];
      blip(ctx, mx + s.x * k, my + s.y * k, G.safehouses[key] ? '#8dff57' : '#3f9e4d', 4, false);
    }
    const P = G.player;
    if (P) blip(ctx, mx + P.x * k, my + P.y * k, '#ffffff', 5, true);
    const obj = AH.Story.objective();
    if (obj) blip(ctx, mx + obj.x * k, my + obj.y * k, '#ffd23f', 5.4, true);
    // progression panel
    const px = mx + mw + 26;
    ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('YOUR RUN', px, 96);
    ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#e8e2f2';
    const lines = [
      'Cash: $' + G.cash,
      'Story: ' + G.storyDone + ' / ' + AH.MISSIONS.length + ' missions',
      'Cars stolen: ' + G.stats.stolen,
      'Races won: ' + G.stats.racesWon,
      'Deliveries: ' + G.stats.deliveries,
      'Safehouses: ' + Object.values(G.safehouses).filter(Boolean).length + ' / 4',
      '',
      'Playing as: ' + (P ? P.name : '—'),
      'Partner: ' + (G.partner ? G.partner.name : '—'),
    ];
    lines.forEach((l, i) => ctx.fillText(l, px, 128 + i * 24));
    ctx.fillStyle = '#9d94b8'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('★ yellow — objective / places', px, 128 + lines.length * 24 + 16);
    ctx.fillText('★ green — safehouses (yours glow)', px, 128 + lines.length * 24 + 36);
    ctx.fillText('Reputation grows where you work.', px, 128 + lines.length * 24 + 56);
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f), g = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f);
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  return { draw, drawMap };
})();
