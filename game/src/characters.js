'use strict';
/* Azul Heat — the two runners. Lucía Ferro, a courier who knows every
   alley in Bahía Azul (cars answer quicker in her hands), and Marco
   Reyes, an ex-mechanic (any car he drives takes more punishment).
   Tab swaps control; the other runner stays where you left them. */
AH.Chars = (function () {
  const U = AH.U;

  const list = [
    { id: 'lucia', name: 'Lucía Ferro', role: 'Courier — better handling',
      shirt: '#ff5964', pants: '#2b2d42', hair: '#201510', skin: '#c68642',
      handling: 1.18, toughness: 1.0 },
    { id: 'marco', name: 'Marco Reyes', role: 'Ex-mechanic — tougher cars',
      shirt: '#37e0ff', pants: '#3d405b', hair: '#111111', skin: '#8d5524',
      handling: 1.0, toughness: 1.45 },
  ];

  function makeRunner(charId, x, y) {
    const def = list[charId];
    return {
      charId, x, y, ang: -Math.PI / 2, speed: 0, hp: 100, armor: 0,
      inCar: null, walkPhase: 0, fireT: 0, dead: false,
      def, name: def.name,
    };
  }

  function spawnPair() {
    const G = AH.G;
    const door = AH.PLACES.carmenBakery;
    G.player = makeRunner(0, door.x - 60, door.y + 30);
    G.partner = makeRunner(1, door.x + 40, door.y + 46);
  }

  function switchRunner() {
    const G = AH.G, P = G.player;
    if (P.inCar) return;                       // swap on foot only
    if (G.dialogue) return;
    const old = P, partner = G.partner;
    const nx = partner.x, ny = partner.y;
    partner.x = old.x; partner.y = old.y; partner.ang = old.ang;
    old.x = nx; old.y = ny;
    partner.hp = old.hp; partner.armor = old.armor; // shared condition, simple & fair
    G.player = partner; G.partner = old;
    AH.toast('Now playing: ' + partner.name);
    AH.Audio.blip(660);
    if (G.mission && G.mission.needSwitch) G.mission.switched = true;
  }

  function enterExit() {
    const G = AH.G, P = G.player;
    if (P.inCar) {
      const car = P.inCar;
      P.x = car.x + Math.cos(car.ang + Math.PI / 2) * 30;
      P.y = car.y + Math.sin(car.ang + Math.PI / 2) * 30;
      car.mode = 'parked'; car.driver = null;
      P.inCar = null;
      AH.Audio.door();
      return;
    }
    const car = AH.Vehicles.nearestEnterable(P.x, P.y, 52);
    if (!car) {
      if (!AH.Economy.tryInteract(P.x, P.y) && !AH.Story.tryInteract(P.x, P.y)) AH.Gigs.tryStart(P.x, P.y);
      return;
    }
    if (car.mode === 'traffic') {              // carjacking a moving car
      car.mode = 'parked';
      const d = AH.Peds.makePed(car.x + 24, car.y + 10, 'civil');
      d.state = 'flee'; d.fleeT = 2.4; d.fx = car.x; d.fy = car.y;
      G.peds.push(d);
      AH.Peds.scare(car.x, car.y, 130);
      AH.Police.addCrime(1, car.x, car.y);
      G.stats.stolen++;
    } else if (car.mode === 'parked') {
      if (!car.everStolen) { car.everStolen = true; G.stats.stolen++; }
    } else if (car.mode === 'police') {
      AH.Police.addCrime(2, car.x, car.y);
    }
    if (AH.Chars.list[P.charId].toughness > 1) car.hp = Math.min(100, car.hp * AH.Chars.list[P.charId].toughness);
    car.mode = 'player'; car.driver = P;
    P.inCar = car; P.x = car.x; P.y = car.y;
    AH.Audio.door(); AH.Audio.engineStart();
  }

  function update(dt) {
    const G = AH.G, P = G.player, In = AH.Input;
    if (!P || P.dead) return;
    if (P.inCar) {
      const car = P.inCar;
      let th = 0, st = 0;
      if (In.key('KeyW') || In.key('ArrowUp')) th = 1;
      if (In.key('KeyS') || In.key('ArrowDown')) th = -1;
      if (In.key('KeyA') || In.key('ArrowLeft')) st = -1;
      if (In.key('KeyD') || In.key('ArrowRight')) st = 1;
      AH.Vehicles.drive(car, dt, th, st, In.key('Space'));
      P.x = car.x; P.y = car.y; P.ang = car.ang;
      if (In.pressed('KeyH')) AH.Audio.honk();
      return;
    }
    // on foot
    let mx = 0, my = 0;
    if (In.key('KeyW') || In.key('ArrowUp')) my -= 1;
    if (In.key('KeyS') || In.key('ArrowDown')) my += 1;
    if (In.key('KeyA') || In.key('ArrowLeft')) mx -= 1;
    if (In.key('KeyD') || In.key('ArrowRight')) mx += 1;
    const run = In.key('ShiftLeft') || In.key('ShiftRight');
    const mag = Math.hypot(mx, my) || 1;
    const spd = (run ? 218 : 128);
    P.speed = (mx || my) ? spd : 0;
    if (mx || my) {
      P.ang = Math.atan2(my / mag, mx / mag);
      const nx = P.x + (mx / mag) * spd * dt, ny = P.y + (my / mag) * spd * dt;
      const res = AH.World.collide(nx, ny, 11);
      P.x = res.x; P.y = res.y;
      if (P.x > AH.CFG.waterX - 14) P.x = AH.CFG.waterX - 14;
      P.walkPhase += dt * (run ? 11 : 8);
    }
    // face the mouse for aiming
    const m = In.mouseWorld();
    if (In.mouse.down) P.ang = U.angTo(P.x, P.y, m.x, m.y);
  }

  return { list, makeRunner, spawnPair, switchRunner, enterExit, update };
})();
