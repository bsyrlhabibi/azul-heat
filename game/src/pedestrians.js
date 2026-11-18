'use strict';
/* Azul Heat — pedestrians. They stroll the sidewalks and the beach,
   chat in pairs, and scatter when the shooting starts or a car mounts
   the kerb. Foot police are peds too, flagged with kind 'cop'. */
AH.Peds = (function () {
  const R = AH.Rng, U = AH.U, C = AH.CFG;
  const SHIRTS = ['#ff5964', '#ffd23f', '#37e0ff', '#8dff57', '#ff9f1c', '#f5f0e6', '#c77dff', '#4ecdc4', '#ff8fa3'];
  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

  function makePed(x, y, kind) {
    return {
      x, y, ang: R.range(0, Math.PI * 2), speed: 0, kind: kind || 'civil',
      shirt: kind === 'cop' ? '#274690' : R.pick(SHIRTS),
      skin: R.pick(SKIN), hair: R.pick(['#201510', '#3a2410', '#6e4a1f', '#111', '#7a7a7a', '#b5533c']),
      hp: kind === 'cop' ? 60 : 30, walkT: R.range(0, 6), state: 'walk',
      tx: x, ty: y, fleeT: 0, downT: 0, fireT: 0, walkPhase: R.range(0, 6),
    };
  }

  function sidewalkPoint() {
    // a point on a block edge (the pavement ring around each block)
    if (R.chance(0.72)) {
      const rx = R.pick(C.vRoads), off = (C.roadW / 2 + 13) * (R.chance(0.5) ? -1 : 1);
      return { x: rx + off, y: R.range(40, C.worldH - 40) };
    }
    const ry = R.pick(C.hRoads), off = (C.roadW / 2 + 13) * (R.chance(0.5) ? -1 : 1);
    return { x: R.range(40, C.seaX - 60), y: ry + off };
  }

  function populate() {
    const G = AH.G;
    for (let i = 0; i < 42; i++) { const p = sidewalkPoint(); G.peds.push(makePed(p.x, p.y)); }
    for (let i = 0; i < 8; i++) G.peds.push(makePed(R.range(C.seaX + 40, C.waterX - 50), R.range(80, C.worldH - 80)));
  }

  function scare(x, y, radius) {
    for (const p of AH.G.peds) {
      if (p.kind === 'cop' || p.downT > 0) continue;
      if (U.dist2(p.x, p.y, x, y) < radius * radius) { p.state = 'flee'; p.fleeT = R.range(1.4, 2.6); p.fx = x; p.fy = y; }
    }
  }

  function update(dt) {
    const G = AH.G, P = G.player;
    for (const p of G.peds) {
      if (p.downT > 0) { p.downT -= dt; continue; }
      let want = 0, dirx = 0, diry = 0;
      if (p.kind === 'cop') { AH.Police.updateFootCop(p, dt); continue; }
      if (p.state === 'flee') {
        p.fleeT -= dt;
        const a = U.angTo(p.fx, p.fy, p.x, p.y);
        dirx = Math.cos(a); diry = Math.sin(a); want = 148;
        if (p.fleeT <= 0) p.state = 'walk';
      } else {
        if (U.dist(p.x, p.y, p.tx, p.ty) < 14 || p.walkT <= 0) {
          const n = sidewalkPoint();
          // wander locally: pick a target up to 500px away on the pavements
          p.tx = U.clamp(p.x + R.range(-460, 460), 20, C.waterX - 30);
          p.ty = U.clamp(p.y + R.range(-460, 460), 20, C.worldH - 20);
          if (AH.World.groundAt(p.tx, p.ty) === 'water') { p.tx = n.x; p.ty = n.y; }
          p.walkT = R.range(4, 9);
        }
        p.walkT -= dt;
        const a = U.angTo(p.x, p.y, p.tx, p.ty);
        dirx = Math.cos(a); diry = Math.sin(a); want = 52;
      }
      p.ang = U.angLerp(p.ang, Math.atan2(diry, dirx), dt * 8);
      p.speed = U.lerp(p.speed, want, dt * 5);
      let nx = p.x + Math.cos(p.ang) * p.speed * dt;
      let ny = p.y + Math.sin(p.ang) * p.speed * dt;
      const res = AH.World.collide(nx, ny, 9);
      p.x = res.x; p.y = res.y;
      p.walkPhase += dt * (2 + p.speed * 0.09);
      // run over by a fast car?
      for (const c of G.cars) {
        if (Math.abs(c.speed) > 130 && U.dist2(c.x, c.y, p.x, p.y) < 30 * 30) {
          p.downT = 6; AH.Audio.thud();
          if (c.mode === 'player') AH.Police.addCrime(2, p.x, p.y);
          break;
        }
      }
    }
    // keep the streets populated near the player
    if (P && G.peds.filter(p => p.kind === 'civil').length < 44) {
      const s = sidewalkPoint();
      if (U.dist(s.x, s.y, P.x, P.y) > 500) G.peds.push(makePed(s.x, s.y));
    }
    G.peds = G.peds.filter(p => p.downT <= 900); // peds get up and walk off; never culled wrongly
  }

  return { makePed, populate, scare, update };
})();
