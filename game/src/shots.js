// Azul Heat — shots.js: the staged scenes behind ?shot=chase|marina|mission|map.
// Each one arranges the real game — real cars, real police, the real HUD — into the
// moment the screenshots are taken from, on the seeded city, so the same seed
// always produces the same frame. Nothing here draws anything itself.

import { G } from './state.js';
import { POLICE_COLOR } from './config.js';
import { createCar } from './vehicles.js';
import { spawnPed } from './pedestrians.js';
import { MISSIONS } from './missions.js';

function policeCar(x, y, angle) {
  const car = createCar('sedan', POLICE_COLOR, x, y, angle, 'police');
  car.driver = 'police';
  G.cars.push(car);
  return car;
}

export function stageShot(name) {
  const p = G.player;
  G.started = true;
  if (name === 'chase') {
    // Four stars on the Neon Strip at golden hour, mid-mission.
    const car = createCar('sport', '#e91e63', 1540, 980, 0, 'parked');
    G.cars.push(car);
    p.inCar = car; car.driver = 'player';
    car.vx = 320; p.x = car.x; p.y = car.y;
    policeCar(1380, 940, 0.1); policeCar(1360, 1030, -0.08); policeCar(1240, 985, 0);
    G.police.heat = 157; G.police.stars = 4;
    G.police.heli = { x: 1700, y: 830, lx: 1560, ly: 985 };
    G.objective = 'Club two: Casino Perla — 41s';
    G.cash = 1830; G.ammo = 18;
    G.screen = 'play';
  } else if (name === 'marina') {
    // On foot in the Marina: crowd, traffic, and a car worth stealing.
    p.x = 2452; p.y = 452; p.angle = 0.4;
    G.other.x = 2408; G.other.y = 470;
    const steal = createCar('muscle', '#f39c12', 2494, 466, 0.3, 'parked');
    steal.driver = 'traffic'; // occupied: the prompt offers a carjacking
    G.cars.push(steal);
    for (let i = 0; i < 7; i++) spawnPed(2380 + i * 26, 428 + (i % 3) * 22);
    G.banner = { title: 'THE MARINA', sub: 'Bahía Azul — golden hour', until: 1e9 };
    G.cash = 640;
    G.screen = 'play';
  } else if (name === 'mission') {
    // The finale briefing: both runners with Tía Carmen on her plaza.
    p.x = 2336; p.y = 692; p.angle = 0.5;
    G.other.x = 2426; G.other.y = 716; G.other.angle = -2.6;
    const finale = MISSIONS.find((m) => m.id === 'finale');
    G.card = { kind: 'intro', title: finale.title, contact: 'Tía Carmen', lines: finale.intro };
    G.cash = 3210;
    G.screen = 'card';
    G.camera.x = 2136; G.camera.y = 132; // trio visible bottom-left of the card
    return;
  } else if (name === 'map') {
    // A city worth mapping: story progress, reputation, a car in the garage.
    G.missionsDone = ['lucia_first', 'lucia_wheels', 'marco_debts'];
    G.rep = { marina: 62, oldtown: 45, strip: 30, hills: 25, docks: 38, midtown: 10 };
    G.cash = 4870; G.ammo = 41;
    G.garageCar = { modelId: 'sport', color: '#e91e63' };
    G.screen = 'map';
  } else {
    G.screen = 'play';
  }
  const pos = p.inCar || p;
  G.camera.x = pos.x - 640;
  G.camera.y = pos.y - 400;
}
