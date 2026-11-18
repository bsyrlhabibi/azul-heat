'use strict';
/* Azul Heat — the renderer. A bright, sun-soaked golden-hour grade
   over a 3/4 city: sunlit buildings with long south-east shadows,
   sky-bright glass and warm stone; neon signs are accents on a daylit
   street, not the mood; the sea sparkles. Everything is canvas-drawn —
   there are no image assets. */
AH.Render = (function () {
  const U = AH.U, C = AH.CFG;

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f), g = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f);
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function inView(x, y, m) {
    const G = AH.G;
    return x > G.cam.x - C.viewW / 2 - m && x < G.cam.x + C.viewW / 2 + m &&
           y > G.cam.y - C.viewH / 2 - m && y < G.cam.y + C.viewH / 2 + m;
  }

  function drawGround(ctx) {
    const G = AH.G, t = G.time;
    const vx = G.cam.x - C.viewW / 2 - 60, vy = G.cam.y - C.viewH / 2 - 60;
    const vw = C.viewW + 120, vh = C.viewH + 120;
    ctx.fillStyle = '#8a7a58'; ctx.fillRect(vx, vy, vw, vh);
    for (const d of AH.DISTRICTS) { ctx.fillStyle = shade(d.ground, 1.35); ctx.fillRect(d.x, d.y, d.w, d.h); }
    // block pavements and lawns
    for (const b of AH.World.blocks) {
      if (!inView(b.x0 + (b.x1 - b.x0) / 2, b.y0 + (b.y1 - b.y0) / 2, 700)) continue;
      ctx.fillStyle = '#bcb09a'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      ctx.fillStyle = b.kind === 'park' ? '#639a48' : b.kind === 'parking' ? '#6a6772' : shade(AH.DISTRICTS[AH.World.districtAt(b.x0 + 20, b.y0 + 20)].ground, 1.30);
      ctx.fillRect(b.x0 + 15, b.y0 + 15, b.x1 - b.x0 - 30, b.y1 - b.y0 - 30);
      if (b.kind === 'parking') {
        ctx.strokeStyle = 'rgba(240,235,210,0.4)'; ctx.lineWidth = 2;
        for (let x = b.x0 + 44; x < b.x1 - 30; x += 52) { ctx.beginPath(); ctx.moveTo(x, b.y0 + 26); ctx.lineTo(x, b.y1 - 26); ctx.stroke(); }
      }
    }
    // beach and sea
    const sand = ctx.createLinearGradient(C.seaX, 0, C.waterX, 0);
    sand.addColorStop(0, '#f0d79c'); sand.addColorStop(1, '#e0be82');
    ctx.fillStyle = sand; ctx.fillRect(C.seaX, 0, C.waterX - C.seaX, C.worldH);
    const sea = ctx.createLinearGradient(C.waterX, 0, C.worldW, 0);
    sea.addColorStop(0, '#3fb0cc'); sea.addColorStop(1, '#2a7d9c');
    ctx.fillStyle = sea; ctx.fillRect(C.waterX, 0, C.worldW - C.waterX, C.worldH);
    ctx.fillStyle = 'rgba(255,250,230,0.5)';
    for (let y = 30; y < C.worldH; y += 46) {
      const fx = C.waterX + Math.sin(t * 1.4 + y * 0.05) * 5;
      ctx.fillRect(fx - 3, y, 26 + Math.sin(t + y) * 8, 2.4);
    }
    ctx.fillStyle = 'rgba(255,246,200,0.75)';
    for (let i = 0; i < 110; i++) {
      const sx = C.waterX + 16 + ((i * 173) % (C.worldW - C.waterX - 30));
      const sy = (i * 389) % C.worldH;
      if (!inView(sx, sy, 30)) continue;
      const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.8 + i * 1.37));
      ctx.globalAlpha = a; ctx.fillRect(sx, sy, 7, 1.8);
    }
    ctx.globalAlpha = 1;
    // roads
    ctx.fillStyle = '#5d5a66';
    for (const rx of C.vRoads) ctx.fillRect(rx - C.roadW / 2, 0, C.roadW, C.worldH);
    for (const ry of C.hRoads) ctx.fillRect(0, ry - C.roadW / 2, C.seaX, C.roadW);
    ctx.fillStyle = 'rgba(232,224,176,0.65)';
    for (const rx of C.vRoads) for (let y = 8; y < C.worldH; y += 92) ctx.fillRect(rx - 2, y, 4, 46);
    for (const ry of C.hRoads) for (let x = 8; x < C.seaX; x += 92) ctx.fillRect(x, ry - 2, 46, 4);
    ctx.fillStyle = 'rgba(245,240,230,0.45)';
    for (const rx of C.vRoads) for (const ry of C.hRoads)
      for (let i = 0; i < 4; i++) ctx.fillRect(rx - C.roadW / 2 + 8 + i * 27, ry - C.roadW / 2 - 13, 15, 5);
    // pier planks
    ctx.fillStyle = '#7a5a38'; ctx.fillRect(C.waterX - 12, 472, 330, 86);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let x = C.waterX; x < C.waterX + 318; x += 26) ctx.fillRect(x, 472, 3, 86);
    // lamp + neon light pools
    ctx.globalCompositeOperation = 'lighter';
    for (const l of AH.World.lamps) {
      if (!inView(l.x, l.y, 90)) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 56);
      g.addColorStop(0, 'rgba(255,196,96,0.06)'); g.addColorStop(1, 'rgba(255,196,96,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, 56, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of AH.World.buildings) {
      const dist = AH.DISTRICTS[b.di];
      if (!dist.neon || !inView(b.x, b.y, 200)) continue;
      const col = dist.neon[b.seed % dist.neon.length];
      const g = ctx.createRadialGradient(b.x + b.w / 2, b.y + b.d + 16, 4, b.x + b.w / 2, b.y + b.d + 16, 92);
      g.addColorStop(0, col + '12'); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.fillRect(b.x - 92, b.y + b.d - 40, b.w + 184, 150);
    }
    ctx.globalCompositeOperation = 'source-over';
    // building shadows (long, to the south-east)
    ctx.fillStyle = 'rgba(74,38,8,0.32)';
    for (const b of AH.World.buildings) {
      if (!inView(b.x, b.y, 420)) continue;
      rr(ctx, b.x + 12 + b.h * 0.30, b.y + 9 + b.h * 0.34, b.w, b.d, 5); ctx.fill();
    }
  }

  function drawBuilding(ctx, b) {
    const lift = b.h * 0.55, lean = b.h * 0.20;
    if (b.kind === 'container') {
      const cols = ['#b5523c', '#3c7db5', '#4da34d', '#c9862b', '#7a4da3'];
      const col = cols[b.seed % cols.length];
      ctx.fillStyle = shade(col, 0.72); rr(ctx, b.x, b.y, b.w, b.d, 2); ctx.fill();
      ctx.fillStyle = col; rr(ctx, b.x - 3, b.y - lift * 0.5, b.w, b.d, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
      for (let x = b.x + 12; x < b.x + b.w - 6; x += 15) { ctx.beginPath(); ctx.moveTo(x, b.y - lift * 0.5 + 3); ctx.lineTo(x, b.y - lift * 0.5 + b.d - 3); ctx.stroke(); }
      return;
    }
    // east face, south face, roof — a shaded 3/4 box
    ctx.fillStyle = shade(b.wall, 0.70);
    ctx.beginPath();
    ctx.moveTo(b.x - lean + b.w, b.y - lift); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + b.d); ctx.lineTo(b.x - lean + b.w, b.y - lift + b.d); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(b.wall, 0.98);
    ctx.beginPath();
    ctx.moveTo(b.x - lean, b.y - lift + b.d); ctx.lineTo(b.x - lean + b.w, b.y - lift + b.d); ctx.lineTo(b.x + b.w, b.y + b.d); ctx.lineTo(b.x, b.y + b.d); ctx.closePath(); ctx.fill();
    // lit windows on the south face (bilinear across the slanted quad)
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 30));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
      const lit = ((b.seed * (i + 3) * (j + 7)) % 10) / 10 < b.winLit;
      const px = U.lerp(U.lerp(b.x - lean, b.x - lean + b.w, u), U.lerp(b.x, b.x + b.w, u), v);
      const py = U.lerp(b.y - lift + b.d, b.y + b.d, v) - 4;
      ctx.fillStyle = lit ? 'rgba(255,196,105,0.55)' : 'rgba(168,208,228,0.9)';
      ctx.fillRect(px - 4.5, py - 6, 9, 11);
    }
    // roof + parapet + furniture
    ctx.fillStyle = shade(b.roof, 1.45); rr(ctx, b.x - lean, b.y - lift, b.w, b.d, 3); ctx.fill();
    ctx.strokeStyle = shade(b.roof, 0.78); ctx.lineWidth = 3; rr(ctx, b.x - lean + 4, b.y - lift + 4, b.w - 8, b.d - 8, 3); ctx.stroke();
    if (b.seed % 3 === 0) { ctx.fillStyle = shade(b.roof, 1.35); ctx.fillRect(b.x - lean + b.w * 0.16, b.y - lift + b.d * 0.2, 20, 14); }
    if (b.seed % 4 === 0) { ctx.fillStyle = shade(b.roof, 1.5); ctx.beginPath(); ctx.arc(b.x - lean + b.w * 0.72, b.y - lift + b.d * 0.34, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = shade(b.roof, 0.7); ctx.fillRect(b.x - lean + b.w * 0.72 - 2, b.y - lift + b.d * 0.34, 4, 10); }
    if (b.di === 1 && b.seed % 5 === 0) { ctx.strokeStyle = '#2c2739'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - lean + b.w / 2, b.y - lift + 6); ctx.lineTo(b.x - lean + b.w / 2, b.y - lift - 22); ctx.stroke(); }
    // door + sign
    ctx.fillStyle = 'rgba(16,12,24,0.8)';
    ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.d - 13, 16, 13);
    if (b.sign) {
      const dist = AH.DISTRICTS[b.di];
      const neon = dist.neon ? dist.neon[b.seed % dist.neon.length] : '#ffd9a0';
      ctx.save();
      ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(b.sign).width + 18;
      ctx.fillStyle = 'rgba(14,10,24,0.85)';
      rr(ctx, b.x + b.w / 2 - tw / 2, b.y + b.d - lift - 26, tw, 19, 4); ctx.fill();
      ctx.shadowColor = neon; ctx.shadowBlur = 13;
      ctx.fillStyle = neon;
      ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.d - lift - 12);
      ctx.restore();
    }
  }

  function drawCar(ctx, car) {
    const def = car.def, L = def.len, Wd = def.wid;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.fillStyle = 'rgba(60,30,5,0.34)';
    ctx.beginPath(); ctx.ellipse(5, 8, L * 0.52, Wd * 0.58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(car.ang);
    const col = car.dead ? '#2b2b2b' : car.color;
    ctx.fillStyle = col; rr(ctx, -L / 2, -Wd / 2, L, Wd, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(10,8,18,0.45)'; ctx.lineWidth = 1.6; rr(ctx, -L / 2, -Wd / 2, L, Wd, 8); ctx.stroke();
    ctx.fillStyle = shade(col === '#2b2b2b' ? '#444444' : col, 1.18); rr(ctx, -L / 2 + 5, -Wd / 2 + 3.4, L - 10, Wd - 6.8, 6); ctx.fill();
    // cabin + glass
    ctx.fillStyle = 'rgba(16,20,34,0.92)'; rr(ctx, -L * 0.17, -Wd * 0.37, L * 0.37, Wd * 0.74, 5); ctx.fill();
    ctx.fillStyle = 'rgba(159,216,232,0.75)'; rr(ctx, L * 0.10, -Wd * 0.33, L * 0.09, Wd * 0.66, 3); ctx.fill();
    // wheels
    ctx.fillStyle = '#14141a';
    const wy = Wd / 2 - 2;
    ctx.save(); ctx.translate(L * 0.30, -wy); ctx.rotate(car.steer * 0.4); ctx.fillRect(-7, -2.6, 14, 5.2); ctx.restore();
    ctx.save(); ctx.translate(L * 0.30, wy); ctx.rotate(car.steer * 0.4); ctx.fillRect(-7, -2.6, 14, 5.2); ctx.restore();
    ctx.fillRect(-L * 0.36, -wy - 2.6, 14, 5.2); ctx.fillRect(-L * 0.36, wy - 2.6, 14, 5.2);
    if (car.mode === 'police') {
      ctx.fillStyle = '#274690'; ctx.fillRect(-L / 2 + 4, -3.4, L - 8, 6.8);
      const on = Math.sin(AH.G.time * 10 + car.flashT * 6) > 0;
      ctx.fillStyle = on ? '#ff4040' : '#7a1616'; ctx.fillRect(-9, -Wd * 0.30, 9, Wd * 0.28);
      ctx.fillStyle = on ? '#2a5cff' : '#37a0ff'; ctx.fillStyle = on ? '#16265e' : '#37a0ff'; ctx.fillRect(0, -Wd * 0.30, 9, Wd * 0.28);
    }
    if (car.def.name === 'Taxi Sol') { ctx.fillStyle = '#14141a'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2.6, -2.6, 5.2, 5.2); }
    // lights
    ctx.fillStyle = '#fff3bc';
    ctx.beginPath(); ctx.arc(L / 2 - 1, -Wd * 0.30, 2.6, 0, Math.PI * 2); ctx.arc(L / 2 - 1, Wd * 0.30, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4040';
    ctx.beginPath(); ctx.arc(-L / 2 + 1, -Wd * 0.30, 2.3, 0, Math.PI * 2); ctx.arc(-L / 2 + 1, Wd * 0.30, 2.3, 0, Math.PI * 2); ctx.fill();
    if (car.hp < 62 && !car.dead) { ctx.fillStyle = 'rgba(12,10,14,' + (0.55 - car.hp / 160) + ')'; rr(ctx, L * 0.08, -Wd * 0.3, L * 0.3, Wd * 0.6, 6); ctx.fill(); }
    ctx.restore();
    // headlight cones (barely there in daylight) for the player's car and police
    if ((car.mode === 'player' || car.mode === 'police') && !car.dead) {
      const g = ctx.createRadialGradient(car.x, car.y, 8, car.x + Math.cos(car.ang) * 120, car.y + Math.sin(car.ang) * 120, 130);
      g.addColorStop(0, 'rgba(255,240,180,0.045)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(car.x, car.y);
      ctx.arc(car.x, car.y, 132, car.ang - 0.32, car.ang + 0.32);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawPerson(ctx, p, isPlayer, isPartner) {
    ctx.fillStyle = 'rgba(60,30,5,0.34)';
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 5, 9, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    if (p.downT > 0) {
      ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.ellipse(p.x, p.y, 13, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(p.x + 14, p.y - 3, 5, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const sw = p.speed > 4 ? Math.sin(p.walkPhase) * 4.4 : 0;
    ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 2); ctx.lineTo(p.x + sw, p.y + 7);
    ctx.moveTo(p.x, p.y - 2); ctx.lineTo(p.x - sw, p.y + 7);
    ctx.stroke();
    ctx.fillStyle = p.shirt; rr(ctx, p.x - 6.4, p.y - 16, 12.8, 15, 5); ctx.fill();
    if (p.kind === 'cop') { ctx.fillStyle = '#ffd23f'; ctx.fillRect(p.x - 1.6, p.y - 12, 3.2, 3.2); }
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(p.x, p.y - 21, 5.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.hair || '#201510';
    ctx.beginPath(); ctx.arc(p.x, p.y - 22.6, 5.4, Math.PI, Math.PI * 2); ctx.fill();
    if (p.kind === 'cop') { ctx.fillStyle = '#274690'; ctx.fillRect(p.x - 6, p.y - 26.4, 12, 3.4); }
    if (isPartner) { ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(p.x, p.y - 36, 2.6, 0, Math.PI * 2); ctx.fill(); }
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 13, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawHeli(ctx) {
    const G = AH.G, h = G.heli;
    if (!h) return;
    ctx.fillStyle = 'rgba(60,30,5,0.20)';
    ctx.beginPath(); ctx.ellipse(h.x + 34, h.y + 46, 40, 13, 0, 0, Math.PI * 2); ctx.fill();
    // searchlight cone + pool
    const g = ctx.createRadialGradient(h.x, h.y, 8, h.x, h.y, 128);
    g.addColorStop(0, 'rgba(255,250,210,0.16)'); g.addColorStop(1, 'rgba(255,250,210,0.02)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 128, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,210,0.05)';
    ctx.beginPath(); ctx.moveTo(h.x - 8, h.y - 48); ctx.lineTo(h.x + 8, h.y - 48); ctx.lineTo(h.x + 92, h.y + 66); ctx.lineTo(h.x - 92, h.y + 66); ctx.closePath(); ctx.fill();
    // body
    ctx.save(); ctx.translate(h.x, h.y - 52);
    ctx.fillStyle = '#26303e'; ctx.beginPath(); ctx.ellipse(0, 0, 33, 12.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd8e8'; ctx.beginPath(); ctx.ellipse(13, -1, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2531'; ctx.fillRect(-64, -2.6, 34, 5.2);
    ctx.fillRect(-66, -11, 5, 16);
    ctx.strokeStyle = 'rgba(230,238,245,0.75)'; ctx.lineWidth = 3;
    const ra = G.time * 31;
    ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 46, Math.sin(ra) * 5 - 11); ctx.lineTo(-Math.cos(ra) * 46, -Math.sin(ra) * 5 - 11); ctx.stroke();
    ctx.fillStyle = Math.sin(G.time * 6) > 0 ? '#ff4040' : '#5e1616';
    ctx.beginPath(); ctx.arc(-4, 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawProp(ctx, p) {
    if (p.kind === 'palm') {
      ctx.strokeStyle = '#6e5136'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 4); ctx.quadraticCurveTo(p.x + 3, p.y - 12, p.x + 6, p.y - 22); ctx.stroke();
      ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p.seed;
        ctx.beginPath(); ctx.moveTo(p.x + 6, p.y - 22);
        ctx.quadraticCurveTo(p.x + 6 + Math.cos(a) * 13, p.y - 26 + Math.sin(a) * 5, p.x + 6 + Math.cos(a) * 20, p.y - 19 + Math.sin(a) * 9);
        ctx.stroke();
      }
    } else if (p.kind === 'tree') {
      ctx.fillStyle = 'rgba(60,30,5,0.28)'; ctx.beginPath(); ctx.ellipse(p.x + 5, p.y + 5, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3c6e2e'; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4c8a3a'; ctx.beginPath(); ctx.arc(p.x - 5, p.y - 13, 9, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'umbrella') {
      ctx.strokeStyle = '#e8e2d2'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x, p.y - 12); ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(p.x - 17, p.y - 10); ctx.quadraticCurveTo(p.x, p.y - 24, p.x + 17, p.y - 10); ctx.closePath(); ctx.fill();
    } else if (p.kind === 'crane') {
      ctx.strokeStyle = '#c9862b'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + 30); ctx.lineTo(p.x, p.y - 120); ctx.lineTo(p.x + 130, p.y - 120); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(p.x + 96, p.y - 120); ctx.lineTo(p.x + 96, p.y - 74); ctx.stroke();
      ctx.fillStyle = '#8a5a1d'; ctx.fillRect(p.x + 84, p.y - 74, 24, 18);
    }
  }

  function draw(ctx) {
    const G = AH.G;
    ctx.save();
    const shx = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    const shy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    ctx.translate(C.viewW / 2 - G.cam.x + shx, C.viewH / 2 - G.cam.y + shy);
    drawGround(ctx);
    // ground props (behind entities)
    for (const p of AH.World.props) if (p.kind !== 'crane' && inView(p.x, p.y, 80)) drawProp(ctx, p);
    for (const l of AH.World.lamps) {
      if (!inView(l.x, l.y, 40)) continue;
      ctx.fillStyle = '#2c2c34'; ctx.fillRect(l.x - 1.6, l.y - 15, 3.2, 17);
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(l.x, l.y - 17, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    // y-sorted entities
    const drawables = [];
    for (const b of AH.World.buildings) if (inView(b.x, b.y, 460)) drawables.push({ y: b.y + b.d, f: () => drawBuilding(ctx, b) });
    for (const c of G.cars) if (!c.dead || true) if (inView(c.x, c.y, 160)) drawables.push({ y: c.y + 12, f: () => drawCar(ctx, c) });
    for (const p of G.peds) if (inView(p.x, p.y, 60)) drawables.push({ y: p.y, f: () => drawPerson(ctx, p, false, false) });
    if (G.partner && !G.partner.inCar) drawables.push({ y: G.partner.y, f: () => drawPerson(ctx, G.partner, false, true) });
    if (G.player && !G.player.inCar) drawables.push({ y: G.player.y + 1, f: () => drawPerson(ctx, G.player, true, false) });
    for (const p of AH.World.props) if (p.kind === 'crane') drawables.push({ y: p.y + 34, f: () => drawProp(ctx, p) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.f();
    // bullets, particles, floaters
    ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 2.4;
    for (const b of G.bullets) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016); ctx.stroke(); }
    for (const pt of G.parts) {
      const a = 1 - pt.t / pt.dur;
      if (pt.kind === 'smoke') { ctx.fillStyle = 'rgba(70,66,74,' + (a * 0.42) + ')'; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1 + pt.t * 1.4), 0, Math.PI * 2); ctx.fill(); }
      else if (pt.kind === 'spark') { ctx.fillStyle = 'rgba(255,210,63,' + a + ')'; ctx.fillRect(pt.x - 1.6, pt.y - 1.6, 3.2, 3.2); }
      else if (pt.kind === 'flash') { ctx.fillStyle = 'rgba(255,230,150,' + a + ')'; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 2, 0, Math.PI * 2); ctx.fill(); }
    }
    drawHeli(ctx);
    // objective beacon
    const obj = G.screen === 'play' ? AH.Story.objective() : null;
    if (obj && inView(obj.x, obj.y, 30)) {
      const bob = Math.sin(G.time * 3.4) * 6;
      const g = ctx.createLinearGradient(obj.x, obj.y - 190, obj.x, obj.y);
      g.addColorStop(0, 'rgba(255,210,63,0)'); g.addColorStop(1, 'rgba(255,210,63,0.30)');
      ctx.fillStyle = g; ctx.fillRect(obj.x - 13, obj.y - 190, 26, 190);
      ctx.fillStyle = '#ffd23f';
      ctx.save(); ctx.translate(obj.x, obj.y - 196 + bob); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-8, -8, 16, 16); ctx.restore();
    }
    for (const f of G.floaters) {
      ctx.globalAlpha = 1 - f.t / 1.6;
      ctx.font = 'bold 17px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,6,18,0.8)'; ctx.lineWidth = 3.4;
      const fy = f.y - f.t * 34;
      ctx.strokeText(f.text, f.x, fy); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, fy);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
    // golden-hour grade + vignette
    const vg = ctx.createLinearGradient(0, 0, 0, C.viewH);
    vg.addColorStop(0, 'rgba(255,166,66,0.10)'); vg.addColorStop(0.55, 'rgba(255,166,66,0)');
    vg.addColorStop(1, 'rgba(146,84,20,0.10)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, C.viewW, C.viewH);
    const sun = ctx.createRadialGradient(150, 84, 10, 150, 84, 430);
    sun.addColorStop(0, 'rgba(255,186,92,0.22)'); sun.addColorStop(1, 'rgba(255,186,92,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, C.viewW, C.viewH);
    const vin = ctx.createRadialGradient(C.viewW / 2, C.viewH / 2, C.viewH * 0.42, C.viewW / 2, C.viewH / 2, C.viewH * 0.86);
    vin.addColorStop(0, 'rgba(46,22,4,0)'); vin.addColorStop(1, 'rgba(46,22,4,0.16)');
    ctx.fillStyle = vin; ctx.fillRect(0, 0, C.viewW, C.viewH);
  }

  return { draw, shade };
})();
