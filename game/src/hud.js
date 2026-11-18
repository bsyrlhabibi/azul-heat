'use strict';
/* Azul Heat — the HUD and the screens. In play: minimap, wanted stars,
   cash, health and armour, the objective line, the speedometer, context
   prompts, dialogue and banners. Around it: title, character select
   and pause — all drawn in the same golden-hour voice. */
AH.Hud = (function () {
  const U = AH.U, C = AH.CFG;

  function star(ctx, x, y, r, filled) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) { ctx.fillStyle = '#ffd23f'; ctx.fill(); }
    ctx.strokeStyle = 'rgba(245,240,230,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  function prompt() {
    const G = AH.G, P = G.player;
    if (!P) return null;
    if (G.dialogue) return 'E — next line';
    if (P.inCar) return 'E — step out · H horn · 1/2/3 radio';
    const car = AH.Vehicles.nearestEnterable(P.x, P.y, 52);
    if (car) return car.mode === 'traffic' ? 'E — CARJACK the ' + car.def.name : 'E — Drive the ' + car.def.name;
    return AH.Story.prompt() || AH.Gigs.prompt(P.x, P.y) || AH.Economy.promptAt(P.x, P.y);
  }

  function drawPlay(ctx) {
    const G = AH.G, P = G.player, W = C.viewW, H = C.viewH;
    AH.Minimap.draw(ctx);
    // health + armour beside the minimap
    const bx = 208, bw = 190;
    ctx.fillStyle = 'rgba(10,8,20,0.55)'; AH.Phone.roundRect(ctx, bx - 6, H - 64, bw + 12, 40, 8); ctx.fill();
    ctx.fillStyle = '#3a1522'; AH.Phone.roundRect(ctx, bx, H - 56, bw, 11, 5); ctx.fill();
    ctx.fillStyle = '#ff5964'; AH.Phone.roundRect(ctx, bx, H - 56, bw * U.clamp(P.hp, 0, 100) / 100, 11, 5); ctx.fill();
    ctx.fillStyle = '#22303e'; AH.Phone.roundRect(ctx, bx, H - 40, bw, 8, 4); ctx.fill();
    ctx.fillStyle = '#37a0ff'; AH.Phone.roundRect(ctx, bx, H - 40, bw * U.clamp(P.armor, 0, 100) / 100, 8, 4); ctx.fill();
    // wanted stars + cash, top right
    for (let i = 0; i < 5; i++) star(ctx, W - 178 + i * 34, 34, 13, i < G.wanted);
    if (G.wanted > 0 && G.seenTimer < 2) { ctx.fillStyle = 'rgba(255,64,64,' + (0.5 + Math.sin(G.time * 8) * 0.3) + ')'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('POLICE ON YOU', W - 24, 62); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#8dff57'; ctx.font = 'bold 25px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('$' + G.cash, W - 24, 96);
    ctx.fillStyle = 'rgba(245,240,230,0.85)'; ctx.font = '13px system-ui, sans-serif';
    const di = AH.World.districtAt(P.x, P.y);
    ctx.fillText(AH.DISTRICTS[di].name + ' · rep ' + Math.round(G.rep[di]) + '%', W - 24, 118);
    ctx.textAlign = 'left';
    // objective, top centre
    const obj = AH.Story.objective();
    if (obj) {
      ctx.font = 'bold 16.5px system-ui, sans-serif';
      const tw = ctx.measureText(obj.label).width + 34;
      ctx.fillStyle = 'rgba(10,8,20,0.58)'; AH.Phone.roundRect(ctx, (W - tw) / 2, 16, tw, 32, 9); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center';
      ctx.fillText('◆ ' + obj.label, W / 2, 38);
      ctx.textAlign = 'left';
      // off-screen direction arrow
      const dx = obj.x - P.x, dy = obj.y - P.y, d = Math.hypot(dx, dy);
      if (d > 60) {
        ctx.fillStyle = 'rgba(255,210,63,0.9)'; ctx.font = '12.5px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(d / 10) + 'm ' + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '→' : '←') : (dy > 0 ? '↓' : '↑')), W / 2, 62);
        ctx.textAlign = 'left';
      }
    }
    // speedometer
    if (P.inCar) {
      const kmh = Math.round(Math.abs(P.inCar.speed) * 0.62);
      ctx.fillStyle = 'rgba(10,8,20,0.55)'; AH.Phone.roundRect(ctx, W - 168, H - 84, 144, 60, 10); ctx.fill();
      ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(kmh, W - 62, H - 44);
      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#9d94b8';
      ctx.fillText('km/h', W - 30, H - 44);
      ctx.fillStyle = P.inCar.hp < 30 ? '#ff5964' : '#8dff57'; ctx.font = '11.5px system-ui, sans-serif';
      ctx.fillText(P.inCar.def.name + ' · hull ' + Math.ceil(P.inCar.hp) + '%', W - 30, H - 62 + 34);
      ctx.textAlign = 'left';
    }
    // bust progress
    if (G.bustTimer > 0) {
      ctx.fillStyle = 'rgba(10,8,20,0.6)'; AH.Phone.roundRect(ctx, W / 2 - 110, H - 150, 220, 16, 8); ctx.fill();
      ctx.fillStyle = '#ff4040'; AH.Phone.roundRect(ctx, W / 2 - 110, H - 150, 220 * (G.bustTimer / 1.6), 16, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('BUSTED… RUN!', W / 2, H - 138); ctx.textAlign = 'left';
    }
    // context prompt
    const pr = prompt();
    if (pr && !G.overlay) {
      ctx.font = 'bold 15px system-ui, sans-serif';
      const tw = ctx.measureText(pr).width + 30;
      ctx.fillStyle = 'rgba(10,8,20,0.66)'; AH.Phone.roundRect(ctx, (W - tw) / 2, H - 118, tw, 30, 8); ctx.fill();
      ctx.fillStyle = '#f5f0e6'; ctx.textAlign = 'center'; ctx.fillText(pr, W / 2, H - 97); ctx.textAlign = 'left';
    }
    // dialogue box
    if (G.dialogue) {
      const line = G.dialogue.lines[G.dialogue.i];
      ctx.fillStyle = 'rgba(12,8,22,0.88)'; AH.Phone.roundRect(ctx, W / 2 - 330, H - 208, 660, 86, 12); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; AH.Phone.roundRect(ctx, W / 2 - 330, H - 208, 660, 86, 12); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(line[0], W / 2 - 306, H - 178);
      ctx.fillStyle = '#f5f0e6'; ctx.font = '16.5px system-ui, sans-serif';
      ctx.fillText(line[1], W / 2 - 306, H - 150);
      ctx.fillStyle = '#9d94b8'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('E ▸', W / 2 + 306, H - 134); ctx.textAlign = 'left';
    }
    // banner + toast + district card
    if (G.banner) {
      const b = G.banner, a = Math.min(1, b.t * 3, (b.dur - b.t) * 1.4);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,6,18,0.85)'; ctx.lineWidth = 7; ctx.strokeText(b.title, W / 2, 168);
      ctx.fillStyle = b.color; ctx.fillText(b.title, W / 2, 168);
      ctx.font = '16.5px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,6,18,0.8)'; ctx.lineWidth = 4; ctx.strokeText(b.sub, W / 2, 198);
      ctx.fillStyle = '#f5f0e6'; ctx.fillText(b.sub, W / 2, 198);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (G.toast) {
      ctx.font = '14px system-ui, sans-serif';
      const tw = ctx.measureText(G.toast.text).width + 26;
      ctx.fillStyle = 'rgba(12,8,22,0.82)'; AH.Phone.roundRect(ctx, (W - tw) / 2, 128 + (G.banner ? 76 : 0), tw, 28, 8); ctx.fill();
      ctx.fillStyle = '#f5f0e6'; ctx.textAlign = 'center'; ctx.fillText(G.toast.text, W / 2, 147 + (G.banner ? 76 : 0)); ctx.textAlign = 'left';
    }
    if (G.districtTimer > 0) {
      ctx.globalAlpha = Math.min(1, G.districtTimer);
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(10,6,18,0.8)'; ctx.lineWidth = 6; ctx.strokeText(G.districtName.toUpperCase(), W / 2, H - 240);
      ctx.fillStyle = '#ffd9a0'; ctx.fillText(G.districtName.toUpperCase(), W / 2, H - 240);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  function drawFigure(ctx, x, y, def, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 8, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.pants; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, 12); ctx.moveTo(0, 0); ctx.lineTo(5, 12); ctx.stroke();
    ctx.fillStyle = def.shirt; AH.Phone.roundRect(ctx, -9, -22, 18, 21, 6); ctx.fill();
    ctx.fillStyle = def.skin; ctx.beginPath(); ctx.arc(0, -29, 7.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.hair; ctx.beginPath(); ctx.arc(0, -31, 7.3, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTitle(ctx) {
    const W = C.viewW, H = C.viewH;
    ctx.fillStyle = 'rgba(24,8,30,0.34)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 34;
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 96px system-ui, sans-serif';
    ctx.fillText('AZUL HEAT', W / 2, 218);
    ctx.restore();
    ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.fillText('T W O   R U N N E R S', W / 2, 262);
    ctx.font = '16.5px system-ui, sans-serif'; ctx.fillStyle = '#ffd9a0';
    ctx.fillText('An original open-world crime story in the city of Bahía Azul — two runners, six districts, one long sunset.', W / 2, 300);
    ctx.fillStyle = 'rgba(245,240,230,0.92)'; ctx.font = '15px system-ui, sans-serif';
    const lines = [
      'Steal cars, run missions for Tía Carmen, El Contador and DJ Prisma,',
      'outrun the Policía — patrols, roadblocks and a helicopter — and buy your way up the coast.',
      '',
      'WASD drive & walk · E interact · TAB switch runner · T phone · M map · mouse aim, click to shoot',
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 356 + i * 23));
    ctx.save();
    ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(AH.Save.read() ? 'PRESS ENTER — CONTINUE YOUR RUN' : 'PRESS ENTER — START', W / 2, 520);
    ctx.restore();
    ctx.fillStyle = 'rgba(245,240,230,0.65)'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(AH.Save.read() ? 'N — wipe the save and start over' : 'Your run saves itself at every payday.', W / 2, 552);
    ctx.textAlign = 'left';
  }

  function drawSelect(ctx) {
    const G = AH.G, W = C.viewW, H = C.viewH;
    ctx.fillStyle = 'rgba(24,8,30,0.52)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('CHOOSE YOUR RUNNER', W / 2, 120);
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#ffd9a0';
    ctx.fillText('You can switch between them any time with TAB — the city keeps both.', W / 2, 148);
    AH.Chars.list.forEach((def, i) => {
      const cx = W / 2 + (i === 0 ? -190 : 190), cy = 300;
      const sel = G.selectIdx === i;
      ctx.fillStyle = sel ? 'rgba(255,210,63,0.16)' : 'rgba(16,12,28,0.72)';
      AH.Phone.roundRect(ctx, cx - 150, cy - 130, 300, 320, 16); ctx.fill();
      ctx.strokeStyle = sel ? '#ffd23f' : '#3a3350'; ctx.lineWidth = sel ? 3 : 1.6;
      AH.Phone.roundRect(ctx, cx - 150, cy - 130, 300, 320, 16); ctx.stroke();
      drawFigure(ctx, cx, cy - 10, def, 2.6);
      ctx.fillStyle = '#f5f0e6'; ctx.font = 'bold 23px system-ui, sans-serif';
      ctx.fillText(def.name, cx, cy + 116);
      ctx.fillStyle = '#ffd9a0'; ctx.font = '14.5px system-ui, sans-serif';
      ctx.fillText(def.role, cx, cy + 142);
      ctx.fillStyle = 'rgba(245,240,230,0.7)'; ctx.font = '12.5px system-ui, sans-serif';
      ctx.fillText(i === 0 ? 'The fastest courier on the coast.' : 'If it has wheels, he can fix it — or take it.', cx, cy + 166);
    });
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('← → choose · ENTER run · or click a runner', W / 2, 620);
    ctx.textAlign = 'left';
  }

  function drawPause(ctx) {
    const G = AH.G, W = C.viewW, H = C.viewH;
    ctx.fillStyle = 'rgba(14,8,22,0.66)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d1830'; AH.Phone.roundRect(ctx, W / 2 - 240, 150, 480, 470, 18); ctx.fill();
    ctx.strokeStyle = '#3a3350'; ctx.lineWidth = 2; AH.Phone.roundRect(ctx, W / 2 - 240, 150, 480, 470, 18); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('PAUSED', W / 2, 208);
    ctx.fillStyle = '#f5f0e6'; ctx.font = '15.5px system-ui, sans-serif';
    const rows = [
      'P / Esc — back to the streets',
      'S — save the run now',
      'T — phone · M — city map',
      'N — ' + (G.muted ? 'unmute' : 'mute') + ' all sound',
      'X — wipe save & restart from zero',
      '',
      'Cash $' + G.cash + ' · Story ' + G.storyDone + '/' + AH.MISSIONS.length,
      'Cars stolen ' + G.stats.stolen + ' · Races ' + G.stats.racesWon + ' · Deliveries ' + G.stats.deliveries,
      '',
      'Controls: WASD walk/drive · mouse aim · click shoot',
      'E enter/steal/talk/buy · Space handbrake · Shift sprint',
      'TAB switch runner · H horn · 1/2/3 radio stations',
    ];
    rows.forEach((l, i) => ctx.fillText(l, W / 2, 256 + i * 27));
    ctx.textAlign = 'left';
  }

  function draw(ctx) {
    const G = AH.G;
    if (G.screen === 'title') { drawTitle(ctx); return; }
    if (G.screen === 'select') { drawSelect(ctx); return; }
    drawPlay(ctx);
    if (G.overlay === 'map') AH.Minimap.drawMap(ctx);
    else if (G.overlay === 'phone') AH.Phone.draw(ctx);
    else if (G.overlay === 'pause') drawPause(ctx);
  }

  return { draw, prompt };
})();
