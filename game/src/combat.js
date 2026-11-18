'use strict';
/* Azul Heat — combat: mouse-aimed shooting on foot, bullets, damage to
   people and cars, and the two ways a run ends: LIGHTS OUT (hospital)
   and COLLARED (fine). Keep it arcade: fast, readable, forgiving. */
AH.Combat = (function () {
  const R = AH.Rng, U = AH.U;

  function spawnBullet(x, y, ang, from) {
    AH.G.bullets.push({ x, y, vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, t: 0, from });
  }

  function hurtPlayer(amount) {
    const G = AH.G, P = G.player;
    if (!P || P.dead) return;
    if (P.armor > 0) { const soak = Math.min(P.armor, amount * 0.65); P.armor -= soak; amount -= soak; }
    P.hp -= amount;
    G.shake = Math.min(8, G.shake + 2.5);
    if (P.hp <= 0) wasted();
  }

  function wasted() {
    const G = AH.G, P = G.player;
    P.dead = true; G.stats.wasted++;
    const fee = Math.max(50, Math.floor(G.cash * 0.1));
    AH.banner('LIGHTS OUT', 'Hospital del Sol patched you up — fee $' + fee, '#ff5964', 3.6);
    setTimeout(() => {
      G.cash = Math.max(0, G.cash - fee);
      P.hp = 100; P.armor = 0; P.dead = false;
      if (P.inCar) { P.inCar.mode = 'parked'; P.inCar = null; }
      P.x = AH.PLACES.hospital.x; P.y = AH.PLACES.hospital.y + 16;
      AH.Police.setWanted(0); G.wantedFloor = 0;
      AH.Save.write();
    }, 1400);
  }

  function busted() {
    const G = AH.G, P = G.player;
    G.stats.busted++;
    const fine = Math.min(G.cash, 120 + G.wanted * 90);
    G.cash -= fine;
    AH.banner('COLLARED', 'The police fine you $' + fine + ' and take the heat off.', '#37e0ff', 3.4);
    AH.Police.setWanted(0); G.wantedFloor = 0; G.bustTimer = 0;
    if (G.mission && G.mission.failOnBust) AH.Story.failMission('Caught during the job.');
    AH.Save.write();
  }

  function update(dt) {
    const G = AH.G, P = G.player, In = AH.Input;
    if (!P || P.dead) return;
    // player shooting: on foot, mouse held, not in a menu
    P.fireT -= dt;
    if (!P.inCar && In.mouse.down && !G.overlay && !G.dialogue && P.fireT <= 0) {
      P.fireT = 0.145;
      const m = In.mouseWorld();
      const a = U.angTo(P.x, P.y, m.x, m.y) + R.range(-0.035, 0.035);
      spawnBullet(P.x + Math.cos(a) * 16, P.y + Math.sin(a) * 16, a, 'player');
      G.parts.push({ kind: 'flash', x: P.x + Math.cos(a) * 20, y: P.y + Math.sin(a) * 20, vx: 0, vy: 0, t: 0, dur: 0.06, size: 9 });
      AH.Audio.shot();
      AH.Peds.scare(P.x, P.y, 210);
      AH.Police.addCrime(1, P.x, P.y);
    }
    // bullets
    for (const b of G.bullets) {
      b.t += dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.from === 'player') {
        for (const p of G.peds) {
          if (p.downT > 0) continue;
          if (U.dist2(p.x, p.y, b.x, b.y) < 13 * 13) {
            p.hp -= 34; b.t = 9;
            if (p.hp <= 0) { p.downT = 8; AH.Police.addCrime(p.kind === 'cop' ? 3 : 2, p.x, p.y); }
            break;
          }
        }
        if (b.t < 9) for (const c of G.cars) {
          if (c.mode === 'player') continue;
          if (U.dist2(c.x, c.y, b.x, b.y) < 30 * 30) { AH.Vehicles.damage(c, 7, b.vx / 780, b.vy / 780); b.t = 9; break; }
        }
      } else if (!P.inCar && U.dist2(P.x, P.y, b.x, b.y) < 13 * 13) {
        hurtPlayer(R.range(6, 11)); b.t = 9;
      }
    }
    G.bullets = G.bullets.filter(b => b.t < 0.85);
    // particles & floaters always tick here
    for (const pt of G.parts) { pt.t += dt; pt.x += (pt.vx || 0) * dt; pt.y += (pt.vy || 0) * dt; }
    G.parts = G.parts.filter(pt => pt.t < pt.dur);
    for (const f of G.floaters) f.t += dt;
    G.floaters = G.floaters.filter(f => f.t < 1.6);
  }

  return { spawnBullet, hurtPlayer, wasted, busted, update };
})();
