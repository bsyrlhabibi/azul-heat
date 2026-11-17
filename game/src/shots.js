// shots.js — deterministic staging for the four entry screenshots, driven
// by ?shot= in the URL (see shots.json). Each scene sets up a real moment
// of the game — a four-star chase, a marina stroll, the finale offer, the
// city map — and lets the normal loop render it.

import { PLACES } from './config.js';
import { G } from './state.js';
import { makeCar } from './vehicles.js';
import { MISSIONS } from './missions.js';

function policeCar(x, y, angle) {
  const car = makeCar('sedan', x, y, angle, { police: true, driver: 'police', color: '#eef1f4' });
  car.ai = { mode: 'chase' };
  G.cars.push(car); G.police.units.push(car);
  return car;
}

export function applyShot(name) {
  G.started = true;
  G.screen = 'play';
  const lucia = G.runners.lucia, marco = G.runners.marco;
  if (name === 'chase') {
    G.district = 'The Marina'; // flips on the first frame: NEON STRIP banner
    const car = makeCar('comet', 2380, 575, 0, { color: '#e63946' });
    car.vx = 165; car.driver = 'player'; car.stolen = true;
    car.hp = car.maxHp = 9999; // the staged chase car cannot be wrecked mid-shot
    G.cars.push(car);
    lucia.car = car; lucia.x = car.x; lucia.y = car.y;
    G.active = 'lucia';
    policeCar(2170, 540, 0.15);
    policeCar(2130, 628, -0.1);
    policeCar(2560, 690, 2.75);
    G.wanted.heat = 3.4; // four stars
    G.police.heli.active = true;
    G.police.heli.x = 2620; G.police.heli.y = 470;
    G.police.heli.lightX = 2540; G.police.heli.lightY = 575;
    G.cash = 1830;
    G.objective = 'Escape the police — break their line of sight';
  } else if (name === 'marina') {
    G.district = 'Old Town'; // flips: THE MARINA banner
    G.active = 'lucia';
    lucia.x = 458; lucia.y = 798; lucia.angle = 0.5;
    const car = makeCar('muscle', 490, 800, 0.35, { color: '#f4840b', parked: true });
    G.cars.push(car);
    marco.x = 356; marco.y = 856;
    G.cash = 640;
    G.objective = 'Meet Tía Carmen at the gold ring';
    G.marker = { x: PLACES.carmen.x, y: PLACES.carmen.y, color: '#ffd23f' };
  } else if (name === 'mission') {
    G.active = 'lucia';
    lucia.x = 366; lucia.y = 852; lucia.angle = 0.9;
    marco.x = 424; marco.y = 884; marco.angle = 2.4;
    G.cash = 3210;
    const finale = MISSIONS.find((m) => m.id === 'finale');
    G.card = { kind: 'offer', title: finale.title, lines: finale.briefing, missionId: 'finale' };
    G.screen = 'card';
    G.camOverride = { x: 150, y: 290 };
  } else if (name === 'map') {
    G.active = 'lucia';
    lucia.x = 2540; lucia.y = 575;
    G.cash = 2210;
    G.missionsDone = ['lucia1', 'marco1'];
    G.rep = { 'The Marina': 44, 'Old Town': 22, 'Neon Strip': 30, 'The Docks': 12, 'Palm Hills': 18, 'Midtown': 8 };
    G.garage = { model: 'comet', color: '#e63946', hp: 90 };
    G.stats.earned = 2400; G.stats.carsStolen = 6; G.stats.shots = 13;
    G.screen = 'map';
  }
}
