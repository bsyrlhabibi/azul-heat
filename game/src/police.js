'use strict';
/* Azul Heat — la Policía de Bahía Azul. Wanted stars, patrol cars that
   hunt, foot cops who bust, roadblocks from three stars and a helicopter
   with a searchlight at four. Break line of sight, hide, swap cars —
   and the heat cools. */
AH.Police = (function () {
  const R = AH.Rng, U = AH.U, C = AH.CFG;

  function addCrime(points, x, y) {
    const G = AH.G;
    if (G.screen !== 'play') return;
    // a crime only counts when someone could plausibly report it:
    // a cop nearby, a crowd, or a camera on the Strip. Scripted mission
    // heat passes points >= 90 to force it.
    let witnessed = points >= 90;
    if (!witnessed) {
      for (const c of G.cars) if (c.mode === 'police' && U.dist2(c.x, c.y, x, y) < 460 * 460) { witnessed = true; break; }
      if (!witnessed) for (const p of G.peds) if (U.dist2(p.x, p.y, x, y) < 190 * 190) { witnessed = true; break; }
      if (!witnessed && AH.World.districtAt(x, y) === 1) witnessed = true; // Strip cameras
    }
    if (!witnessed) return;
    G.wanted = U.clamp(Math.max(G.wanted, Math.min(5, G.wanted + (points >= 90 ? points - 90 : points))), 0, 5);
    G.seenTimer = 0;
  }

  function setWanted(n) { const G = AH.G; G.wanted = U.clamp(n, 0, 5); G.seenTimer = 0; }

  function spawnCopCar() {
    const G = AH.G, P = G.player;
    // spawn on a road in the ring around the player: close enough to
    // join the hunt, far enough not to pop into view.
    let p = null;
    for (let i = 0; i < 14; i++) {
      const cand = AH.World.randomRoadPoint();
      const d = U.dist(cand.x, cand.y, P.x, P.y);
      if (d > 660 && d < 1350) { p = cand; break; }
    }
    if (!p) return;
    const car = AH.Vehicles.makeCar(p.x, p.y, 0, 1, 'police');
    car.color = '#f4f6f7'; car.cruise = 330; car.isCop = true;
    car.driver = { kind: 'cop' };
    G.cars.push(car);
  }

  function spawnRoadblock() {
    const G = AH.G, P = G.player;
    const ahead = 460;
    const bx = P.x + Math.cos(P.ang) * ahead, by = P.y + Math.sin(P.ang) * ahead;
    if (!AH.World.isRoad(bx, by)) return;
    for (let i = -1; i <= 1; i += 2) {
      const car = AH.Vehicles.makeCar(bx + i * 34, by + i * 10, P.ang + Math.PI / 2, 1, 'police');
      car.color = '#f4f6f7'; car.isCop = true; car.roadblock = true; car.speed = 0;
      G.cars.push(car);
      const cop = AH.Peds.makePed(bx + i * 60, by + 26, 'cop');
      G.peds.push(cop);
    }
    AH.toast('Roadblock ahead!');
  }

  function updateFootCop(p, dt) {
    const G = AH.G, P = G.player;
    if (!P) return;
    const d = U.dist(p.x, p.y, P.x, P.y);
    let want = 0;
    if (G.wanted > 0 && d < 620) {
      const a = U.angTo(p.x, p.y, P.x, P.y);
      p.ang = U.angLerp(p.ang, a, dt * 7);
      if (d > 26) { want = P.inCar ? 0 : 168; p.x += Math.cos(a) * want * dt; p.y += Math.sin(a) * want * dt; }
      if (d < 300) G.seenTimer = 0;
      // busting: stay close to a slow, on-foot player
      if (!P.inCar && d < 30 && Math.abs(P.speed) < 40) {
        G.bustTimer += dt;
        if (G.bustTimer > 1.6) AH.Combat.busted();
      }
      // shooting back at an armed, wanted player
      p.fireT -= dt;
      if (G.wanted >= 2 && d < 300 && d > 60 && p.fireT <= 0 && !P.inCar) {
        p.fireT = R.range(0.8, 1.5);
        AH.Combat.spawnBullet(p.x, p.y, U.angTo(p.x, p.y, P.x, P.y) + R.range(-0.09, 0.09), 'cop');
      }
    } else {
      // idle patrol shuffle
      p.walkT -= dt;
      if (p.walkT <= 0) { p.walkT = R.range(2, 5); p.ang = R.range(0, Math.PI * 2); }
      want = 30;
      p.x += Math.cos(p.ang) * want * dt; p.y += Math.sin(p.ang) * want * dt;
    }
    p.walkPhase += dt * (2 + want * 0.07);
    const res = AH.World.collide(p.x, p.y, 9);
    p.x = res.x; p.y = res.y;
  }

  function update(dt) {
    const G = AH.G, P = G.player;
    if (!P) return;
    const wantCops = G.wanted === 0 ? 0 : Math.min(2 + G.wanted * 2, 9);
    let copCars = G.cars.filter(c => c.mode === 'police' && !c.roadblock);
    // despawn roadblocks left far behind
    G.cars = G.cars.filter(c => !(c.roadblock && U.dist(c.x, c.y, P.x, P.y) > 1500));
    if (G.wanted > 0 && copCars.length < wantCops) { G.spawnCopT = (G.spawnCopT || 0) - dt; if (G.spawnCopT <= 0) { G.spawnCopT = 1.6; spawnCopCar(); } }
    if (G.wanted >= 3) { G.roadblockTimer -= dt; if (G.roadblockTimer <= 0) { G.roadblockTimer = R.range(22, 34); spawnRoadblock(); } }
    // pursuit steering
    for (const car of copCars) {
      if (car.roadblock) continue;
      const d = U.dist(car.x, car.y, P.x, P.y);
      if (G.wanted === 0 || d > 2200) { car.mode = 'traffic'; car.isCop = false; car.driver = { kind: 'civilian' }; car.cruise = 150; continue; }
      if (d < 560) G.seenTimer = 0;
      const targetA = U.angTo(car.x, car.y, P.x, P.y);
      let steer = U.clamp(U.angDiff(targetA, car.ang) * 2.4, -1, 1);
      const topChase = 318 + G.wanted * 9;
      const th = car.speed < topChase ? 1 : 0;
      // use the shared arcade drive with a cop-tuned top speed
      const saveTop = car.def.top; car.def = Object.assign({}, car.def, { top: topChase });
      AH.Vehicles.drive(car, dt, th, steer, false);
      car.def = AH.Vehicles.TYPES[car.type];
      // foot cops bail out when close to an on-foot player
      if (!P.inCar && d < 120 && Math.abs(car.speed) < 30 && !car.emptied) {
        car.emptied = true;
        G.peds.push(AH.Peds.makePed(car.x + 20, car.y, 'cop'));
        G.peds.push(AH.Peds.makePed(car.x - 20, car.y + 8, 'cop'));
      }
      if (P.inCar && d < 60) car.emptied = false;
    }
    // helicopter at 4+ stars
    if (G.wanted >= 4) {
      if (!G.heli) { G.heli = { x: P.x + 500, y: P.y - 500 }; AH.toast('Police helicopter overhead!'); }
      G.heli.x = U.lerp(G.heli.x, P.x + Math.sin(G.time * 0.4) * 90, dt * 1.6);
      G.heli.y = U.lerp(G.heli.y, P.y + Math.cos(G.time * 0.31) * 80, dt * 1.6);
      if (U.dist(G.heli.x, G.heli.y, P.x, P.y) < 150) G.seenTimer = 0; // searchlight holds you
    } else G.heli = null;
    // cooling: unseen long enough and the stars fall away
    G.seenTimer += dt;
    const hidden = G.seenTimer > 4.5;
    if (hidden && G.wanted > G.wantedFloor) {
      G.hideTimer += dt;
      if (G.hideTimer > 3.6) { G.hideTimer = 0; G.wanted = Math.max(G.wantedFloor, G.wanted - 1); if (G.wanted === 0) AH.toast('You lost the police.'); }
    } else G.hideTimer = 0;
    if (P.inCar || Math.abs(P.speed) >= 40 || G.wanted === 0) G.bustTimer = Math.max(0, G.bustTimer - dt * 2);
  }

  return { addCrime, setWanted, update, updateFootCop };
})();
