'use strict';
/* Azul Heat — ambient traffic. Cars pick a road, hold their lane, brake
   for whoever is ahead and turn at intersections, so the city feels
   alive and gives the player cars to steal. */
AH.Traffic = (function () {
  const R = AH.Rng, U = AH.U, C = AH.CFG;

  function laneTarget(car) {
    // returns the point the car is steering toward: far ahead in its lane
    const ahead = 260;
    return { x: car.x + Math.cos(car.ang) * ahead, y: car.y + Math.sin(car.ang) * ahead };
  }

  function spawnOne(farFrom) {
    const p = AH.World.randomRoadPoint();
    if (farFrom && U.dist(p.x, p.y, farFrom.x, farFrom.y) < 700) return null;
    // never materialise inside an intersection — crossing spawns wedge
    for (const rx of C.vRoads) for (const ry of C.hRoads)
      if (Math.abs(p.x - rx) < 96 && Math.abs(p.y - ry) < 96) return null;
    const onV = C.vRoads.some(rx => Math.abs(p.x - rx) < 40);
    const dir = R.chance(0.5) ? 1 : -1;
    const lane = 27 * dir;   // right-hand traffic
    const car = AH.Vehicles.makeCar(
      onV ? p.x + (Math.abs(p.x - Math.round(p.x)) >= 0 ? lane * (p.x > 0 ? 1 : 1) : 0) : p.x,
      p.y, 0, R.int(0, 5), 'traffic');
    if (onV) { const rx = C.vRoads.reduce((a, b) => Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a); car.x = rx - lane; car.ang = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { const ry = C.hRoads.reduce((a, b) => Math.abs(b - p.y) < Math.abs(a - p.y) ? b : a); car.y = ry + lane; car.ang = dir > 0 ? 0 : Math.PI; }
    car.cruise = R.range(120, 195);
    car.driver = { kind: 'civilian' };
    return car;
  }

  function populate() {
    const G = AH.G;
    for (let i = 0; i < 24; i++) { const c = spawnOne(null); if (c) G.cars.push(c); }
  }

  function nearestIntersection(x, y) {
    let best = null, bd = 1e12;
    for (const rx of C.vRoads) for (const ry of C.hRoads) {
      const d = (rx - x) * (rx - x) + (ry - y) * (ry - y);
      if (d < bd) { bd = d; best = { x: rx, y: ry }; }
    }
    return best;
  }

  function update(dt) {
    const G = AH.G, P = G.player;
    let trafficCount = 0;
    for (const car of G.cars) {
      if (car.mode !== 'traffic') continue;
      trafficCount++;
      const dP = P ? U.dist(car.x, car.y, P.x, P.y) : 9999;
      if (dP > 2400) { // recycle far-away traffic near the player instead
        const c = spawnOne(P); if (c) { Object.assign(car, c); }
        continue;
      }
      // obstacle scan straight ahead
      let blocked = false;
      const fx = car.x + Math.cos(car.ang) * 74, fy = car.y + Math.sin(car.ang) * 74;
      for (const o of G.cars) {
        if (o === car) continue;
        if (U.dist2(o.x, o.y, fx, fy) < 52 * 52) { blocked = true; break; }
      }
      if (!blocked && P && P.inCar !== car && U.dist2(P.x, P.y, fx, fy) < 46 * 46) blocked = true;
      // turn at intersections sometimes
      const inter = nearestIntersection(car.x, car.y);
      let steer = 0;
      if (inter && U.dist(car.x, car.y, inter.x, inter.y) < 30 && !car.turnCd) {
        car.turnCd = 2.4;
        if (R.chance(0.42)) {
          const turn = R.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
          car.targetAng = car.ang + turn;
        }
      }
      car.turnCd = Math.max(0, (car.turnCd || 0) - dt);
      if (car.targetAng !== undefined && car.targetAng !== null) {
        const diff = U.angDiff(car.targetAng, car.ang);
        steer = U.clamp(diff * 2.2, -1, 1);
        if (Math.abs(diff) < 0.05) car.targetAng = null;
      } else {
        // hold lane centre: steer back toward the road line
        const onV = Math.abs(Math.sin(car.ang)) > 0.7;
        if (onV) { const rx = C.vRoads.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a); steer = U.clamp((rx - Math.sign(Math.sin(car.ang)) * 27 - car.x) * 0.01, -0.4, 0.4); }
        else { const ry = C.hRoads.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a); steer = U.clamp((ry + Math.sign(Math.cos(car.ang)) * 27 - car.y) * 0.01, -0.4, 0.4); }
      }
      // unstick: a car held up too long backs out and tries again
      if (blocked && Math.abs(car.speed) < 12) car.stuckT = (car.stuckT || 0) + dt; else car.stuckT = 0;
      if (car.stuckT > 2.2) { car.stuckT = 0; car.unstick = 0.75; }
      car.unstick = Math.max(0, (car.unstick || 0) - dt);
      const throttle = car.unstick > 0 ? -0.85 : (blocked ? -0.4 : (car.speed < car.cruise ? 0.75 : 0));
      AH.Vehicles.drive(car, dt, throttle, car.unstick > 0 ? -steer : steer, blocked && car.speed > 4 && car.unstick <= 0);
      if (blocked && car.speed < 4 && R.chance(dt * 0.2)) AH.Audio.honk();
    }
    if (trafficCount < 20 && P) { const c = spawnOne(P); if (c) AH.G.cars.push(c); }
  }

  return { populate, update };
})();
