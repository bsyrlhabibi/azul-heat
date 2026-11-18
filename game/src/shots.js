'use strict';
/* Azul Heat — staged scenes for the entry screenshots. ?shot=cover |
   marina | mission | map arranges a real, running game into the moment
   the picture needs: nothing is drawn or composited, the renderer just
   photographs the live simulation from a set-up position. */
AH.Shots = (function () {
  function name() {
    const m = /[?&]shot=([a-z]+)/.exec(location.search);
    return m ? m[1] : null;
  }

  function copCar(x, y, ang, speed) {
    const car = AH.Vehicles.makeCar(x, y, ang, 1, 'police');
    car.color = '#f4f6f7'; car.isCop = true; car.speed = speed;
    car.driver = { kind: 'cop' };
    AH.G.cars.push(car);
    return car;
  }

  function apply() {
    const G = AH.G, shot = name();
    if (!shot) return false;
    G.shotMode = shot;
    G.screen = 'play';
    const P = G.player, door = AH.PLACES.carmenBakery;

    if (shot === 'cover') {
      // 4-star chase up the Strip: player in a Deportivo mid-block on the
      // 2020 road (clear tarmac ahead), three patrol cars behind, the
      // helicopter overhead and a mission live on the HUD.
      const car = AH.Vehicles.makeCar(2020 + 27, 700, -Math.PI / 2, 4, 'player');
      car.speed = 215; car.driver = P;
      G.cars.push(car);
      P.inCar = car; P.x = car.x; P.y = car.y; P.ang = car.ang;
      copCar(2020 + 27, 848, -Math.PI / 2, 222);
      copCar(2020 - 27, 928, -Math.PI / 2, 214);
      copCar(2020 + 27, 1018, -Math.PI / 2, 206);
      G.wanted = 4; G.wantedFloor = 4; G.seenTimer = 0;
      G.heli = { x: P.x + 30, y: P.y - 90 };
      G.mission = { def: AH.MISSIONS[2], stage: 1, t: 118, switched: false, failOnBust: false };
      G.cash = 640;
    } else if (shot === 'marina') {
      // on foot at the Marina, crowds and traffic around, a car to steal.
      P.x = 3035; P.y = 712; P.ang = Math.PI / 2;
      G.partner.x = 3090; G.partner.y = 700;
      for (let i = 0; i < 7; i++)
        G.peds.push(AH.Peds.makePed(2960 + i * 55, 690 + (i % 3) * 46, 'civil'));
      const t = AH.Vehicles.makeCar(3620 - 27, 560, Math.PI / 2, 2, 'traffic');
      t.speed = 120; t.driver = { kind: 'civilian' }; t.cruise = 130;
      G.cars.push(t);
      G.districtName = 'Marina'; G.districtTimer = 2.6;
      G.cash = 410;
    } else if (shot === 'mission') {
      // the Prisma's Night finale at Muelle Azul Pier: both runners on
      // the sand together, the timed pier run live on the HUD with its
      // beacon on the pier — and a live firefight, not a pose: Lucía's
      // trigger is held down through the game's own input, two foot
      // cops close in under the real pursuit AI, and every bullet,
      // flash and hit is the combat system itself.
      const pier = AH.PLACES.pier;
      P.x = pier.x - 172; P.y = pier.y; P.ang = 0;
      G.partner.x = pier.x - 128; G.partner.y = pier.y + 40; G.partner.ang = 0.4;
      G.peds.push(AH.Peds.makePed(pier.x + 96, pier.y - 30, 'cop'));
      G.peds.push(AH.Peds.makePed(pier.x + 132, pier.y + 46, 'cop'));
      G.mission = { def: AH.MISSIONS[2], stage: 1, t: 148, switched: false, failOnBust: false };
      AH.Input.mouse.x = 976; AH.Input.mouse.y = 370; AH.Input.mouse.down = true;
      G.wanted = 2; G.wantedFloor = 2; G.seenTimer = 0;
      AH.Phone.addMessage('DJ Prisma', 'The pier crowd is waiting, estrella. Do not be late.');
      G.cash = 640;
    } else if (shot === 'map') {
      // the planning screen, with a run worth showing off.
      G.storyDone = 3;
      G.rep = [35, 62, 48, 20, 55, 30];
      G.cash = 1875;
      G.safehouses.oldTownFlat = true;
      G.stats.stolen = 14; G.stats.racesWon = 2; G.stats.deliveries = 3;
      G.overlay = 'map';
      P.x = 2020; P.y = 1750;
    }
    G.cam.x = P.x; G.cam.y = P.y;
    return true;
  }

  return { name, apply };
})();
