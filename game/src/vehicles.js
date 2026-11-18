'use strict';
/* Azul Heat — vehicles: types, spawning (parked cars to steal), arcade
   driving physics, damage and smoke. Traffic and police drive the same
   car objects through their own steering code. */
AH.Vehicles = (function () {
  const R = AH.Rng, U = AH.U;

  const TYPES = [
    { name: 'Compacto', len: 62, wid: 30, top: 265, accel: 210, grip: 3.4, colors: ['#e74c3c', '#f39c12', '#ecf0f1', '#3498db'] },
    { name: 'Sedán',    len: 74, wid: 32, top: 300, accel: 225, grip: 3.1, colors: ['#95a5a6', '#2c3e50', '#7f8c8d', '#dfe6e9'] },
    { name: 'Taxi Sol', len: 74, wid: 32, top: 295, accel: 220, grip: 3.1, colors: ['#ffd23f'] },
    { name: 'Furgoneta', len: 86, wid: 36, top: 250, accel: 180, grip: 2.6, colors: ['#dfe6e9', '#b2bec3', '#74b9ff'] },
    { name: 'Deportivo', len: 76, wid: 34, top: 385, accel: 320, grip: 3.9, colors: ['#ff4fd8', '#37e0ff', '#ff6b35', '#ffe66d'] },
    { name: 'Camión',   len: 104, wid: 40, top: 225, accel: 150, grip: 2.2, colors: ['#a3ada0', '#8f9a94', '#c9b458'] },
  ];

  function makeCar(x, y, ang, typeIdx, mode) {
    const t = TYPES[typeIdx];
    return {
      x, y, ang, speed: 0, type: typeIdx, def: t,
      color: R.pick(t.colors), hp: 100, mode: mode,   // parked | traffic | police | player
      driver: null, steer: 0, smokeT: 0, flashT: R.range(0, 1),
      route: null, honkT: 0, dead: false,
    };
  }

  function spawnParked() {
    const G = AH.G;
    // kerbside parking along roads + the plaza/parking blocks
    for (let i = 0; i < 90; i++) {
      const p = AH.World.randomRoadPoint();
      const onV = AH.CFG.vRoads.some(rx => Math.abs(p.x - rx) < 40);
      const x = onV ? p.x + (R.chance(0.5) ? -46 : 46) : p.x;
      const y = onV ? p.y : p.y + (R.chance(0.5) ? -46 : 46);
      if (AH.World.groundAt(x, y) !== 'road') continue;
      // keep intersections clear and don't stack cars on each other
      let bad = false;
      for (const rx of AH.CFG.vRoads) for (const ry of AH.CFG.hRoads)
        if (Math.abs(x - rx) < 104 && Math.abs(y - ry) < 104) { bad = true; break; }
      if (!bad) for (const c of G.cars) if (Math.abs(c.x - x) < 66 && Math.abs(c.y - y) < 66) { bad = true; break; }
      if (bad) continue;
      const ang = onV ? (R.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (R.chance(0.5) ? 0 : Math.PI);
      G.cars.push(makeCar(x, y, ang, R.int(0, 5), 'parked'));
    }
    // a guaranteed starter car beside Carmen's bakery for the first drive
    G.cars.push(makeCar(3035, 760, Math.PI, 1, 'parked'));
  }

  function nearestEnterable(px, py, range) {
    let best = null, bd = range * range;
    for (const c of AH.G.cars) {
      if (c.dead) continue;
      const d2 = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py);
      if (d2 < bd) { bd = d2; best = c; }
    }
    return best;
  }

  /* Arcade driving for whoever holds the wheel (player or AI sets
     throttle/steer on the car, then this integrates it). */
  function drive(car, dt, throttle, steer, brake) {
    const def = car.def;
    const bonus = car.mode === 'player' && AH.G.player ? AH.Chars.list[AH.G.player.charId].handling : 1;
    if (car.hp <= 0) { car.speed = U.lerp(car.speed, 0, dt * 2); }
    else if (throttle > 0) car.speed += def.accel * throttle * dt * (car.speed < 0 ? 2.2 : 1);
    else if (throttle < 0) car.speed -= def.accel * 0.72 * dt * (car.speed > 0 ? 2.4 : 1);
    else car.speed = U.lerp(car.speed, 0, dt * (brake ? 3.2 : 0.55));
    const top = def.top * (car.hp < 30 ? 0.55 : 1);
    car.speed = U.clamp(car.speed, -top * 0.38, top);
    if (brake) car.speed = U.lerp(car.speed, 0, dt * 3.4);
    const sf = U.clamp(car.speed / 130, -1, 1);
    car.ang += steer * def.grip * bonus * 0.62 * sf * dt * (car.speed < 0 ? -1 : 1);
    car.steer = steer;
    const nx = car.x + Math.cos(car.ang) * car.speed * dt;
    const ny = car.y + Math.sin(car.ang) * car.speed * dt;
    const res = AH.World.collide(nx, ny, def.wid * 0.62);
    if (res.hit && Math.abs(car.speed) > 90) damage(car, Math.abs(car.speed) * 0.055, res.x - car.x, res.y - car.y);
    if (res.hit) car.speed *= -0.24;
    car.x = res.x; car.y = res.y;
    if (car.x > AH.CFG.waterX - 26 && car.speed > 0) { car.speed = 0; car.x = AH.CFG.waterX - 26; }
    // car-vs-car soft push
    for (const o of AH.G.cars) {
      if (o === car || o.dead) continue;
      const rr = (def.len + o.def.len) * 0.32;
      const d2 = (o.x - car.x) * (o.x - car.x) + (o.y - car.y) * (o.y - car.y);
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const px = (o.x - car.x) / d, py = (o.y - car.y) / d;
        o.x += px * push; o.y += py * push;
        if (Math.abs(car.speed) > 120 && o.mode !== 'player') damage(o, 6, px, py);
        if (Math.abs(car.speed) > 170) { damage(car, 4, -px, -py); if (car.mode === 'player') AH.Police.addCrime(1, car.x, car.y); }
      }
    }
    if (car.hp < 48) {
      car.smokeT -= dt;
      if (car.smokeT <= 0) {
        car.smokeT = car.hp < 18 ? 0.05 : 0.13;
        AH.G.parts.push({ kind: 'smoke', x: car.x + R.range(-8, 8), y: car.y - 6, vx: R.range(-6, 6), vy: R.range(-26, -14), t: 0, dur: R.range(0.7, 1.3), size: R.range(6, 13) });
      }
    }
  }

  function damage(car, amount, px, py) {
    car.hp = Math.max(0, car.hp - amount);
    if (car.mode === 'player') AH.G.shake = Math.min(9, AH.G.shake + amount * 0.35);
    for (let i = 0; i < 4; i++)
      AH.G.parts.push({ kind: 'spark', x: car.x + px * 10, y: car.y + py * 10, vx: px * 60 + R.range(-40, 40), vy: py * 60 + R.range(-40, 40), t: 0, dur: 0.32, size: 2.5 });
    AH.Audio.crash(amount);
    if (car.hp <= 0 && !car.dead) { car.dead = true; AH.Audio.boom(); }
  }

  return { TYPES, makeCar, spawnParked, nearestEnterable, drive, damage };
})();
