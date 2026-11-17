// economy.js — money and reputation flow, the Ammu-Nación gun shops, and
// the safehouse services: rest (heal + save) and the one-car garage.

import { PLACES } from './config.js';
import { G, activeRunner, addFloater } from './state.js';
import { makeCar } from './vehicles.js';
import { dist } from './random.js';
import { saveGame } from './save.js';
import { sfx } from './audio.js';

export function addCash(n, x, y) {
  G.cash += n;
  if (n > 0) { G.stats.earned += n; addFloater(x, y - 30, `+$${n}`, '#7bf1a8'); sfx.cash(); }
}
export function addRep(district, n) {
  G.rep[district] = Math.min(100, (G.rep[district] || 0) + n);
}

export const SHOP_ITEMS = [
  { name: 'Body Armor', price: 150, desc: 'Full armor plate', apply(r) { r.armor = 100; } },
  { name: 'Pistol Ammo ×24', price: 40, desc: 'Two spare magazines', apply(r) { r.ammo += 24; } },
  { name: 'Empanada', price: 25, desc: 'Hot, greasy, heals 45', apply(r) { r.hp = Math.min(100, r.hp + 45); } },
];

export function buyItem(i) {
  const item = SHOP_ITEMS[i];
  const r = activeRunner();
  if (!item) return;
  if (G.cash < item.price) { addFloater(r.x, r.y - 26, 'NOT ENOUGH CASH', '#ff5d5d'); sfx.fail(); return; }
  G.cash -= item.price;
  item.apply(r);
  addFloater(r.x, r.y - 26, item.name, '#7bf1a8');
  sfx.cash();
}

// Rest at the safehouse: heal, write the save, and roll the garage car out
// if one is stored and the drive is empty.
export function useSafehouse() {
  const r = activeRunner();
  r.hp = 100;
  saveGame();
  addFloater(r.x, r.y - 28, 'RESTED · SAVED', '#7bf1a8');
  sfx.complete();
  if (G.garage) {
    const g = PLACES.garage;
    const near = G.cars.some((c) => dist(c.x, c.y, g.x, g.y) < 60);
    if (!near) {
      const car = makeCar(G.garage.model, g.x, g.y, 0, { color: G.garage.color });
      car.hp = G.garage.hp; car.stolen = true;
      G.cars.push(car);
      addFloater(g.x, g.y - 24, `Your ${car.def.name} is out front`, '#ffd23f');
    }
  }
}

// Store the car you are driving in the garage (one slot).
export function storeCarInGarage() {
  const r = activeRunner();
  const car = r.car;
  if (!car) return;
  if (car.missionCar) { addFloater(r.x, r.y - 26, "Can't store a job car", '#ff5d5d'); return; }
  G.garage = { model: car.model, color: car.color, hp: Math.max(20, car.hp) };
  G.cars = G.cars.filter((c) => c !== car);
  r.car = null;
  r.x = PLACES.garage.x + 40; r.y = PLACES.garage.y + 26;
  addFloater(r.x, r.y - 26, 'CAR STORED', '#7bf1a8');
  saveGame();
  sfx.click();
}
