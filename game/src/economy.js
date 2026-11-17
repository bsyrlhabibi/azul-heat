// Azul Heat — economy.js: money, reputation and the places that take both. Missions
// and gigs pay cash and district reputation; gun shops sell armour and ammunition;
// the Palm Hills safehouse heals, saves, and its garage stores one car for you.

import { G } from './state.js';
import { districtAt } from './world.js';
import { createCar } from './vehicles.js';
import { exitCar } from './characters.js';
import { saveGame } from './save.js';
import { sfx } from './audio.js';

export function addCash(n) {
  G.cash += n;
  if (n > 0) sfx.cash();
}

export function addRep(x, y, n) {
  const d = districtAt(x, y);
  G.rep[d.id] = Math.min(100, (G.rep[d.id] || 0) + n);
}

export function repTotal() {
  return Object.values(G.rep).reduce((a, b) => a + b, 0);
}

function near(x, y, d) {
  const p = G.player;
  const pos = p.inCar || p;
  return Math.hypot(pos.x - x, pos.y - y) < d;
}

export function economyPrompt() {
  const p = G.player;
  for (const shop of G.world.gunShops) {
    if (near(shop.x, shop.y, 46) && !p.inCar) {
      return p.armor < 100 && G.cash >= 250 ? `E — buy armour ($250) at ${shop.name}` : `E — buy ammo ×24 ($60) at ${shop.name}`;
    }
  }
  const sh = G.world.safehouse;
  if (p.inCar && near(sh.garage.x + sh.garage.w / 2, sh.garage.y + sh.garage.h / 2, 90)) return 'E — store this car in your garage';
  if (!p.inCar && G.garageCar && near(sh.garage.x + sh.garage.w / 2, sh.garage.y + sh.garage.h / 2, 80)) return `E — take your ${G.garageCar.modelId} from the garage`;
  if (!p.inCar && near(sh.x, sh.y, 46)) return 'E — rest at the safehouse (heal + save)';
  return null;
}

/** The E key at a shop or the safehouse. True if it was used. */
export function tryEconomyInteract() {
  const p = G.player;
  for (const shop of G.world.gunShops) {
    if (near(shop.x, shop.y, 46) && !p.inCar) {
      if (p.armor < 100 && G.cash >= 250) { G.cash -= 250; p.armor = 100; sfx.pickup(); return true; }
      if (G.cash >= 60) { G.cash -= 60; G.ammo += 24; sfx.pickup(); return true; }
      G.banner = { title: 'NOT ENOUGH CASH', sub: `${shop.name} — armour $250, ammo $60`, until: G.time + 1.6 };
      return true;
    }
  }
  const sh = G.world.safehouse;
  const gx = sh.garage.x + sh.garage.w / 2, gy = sh.garage.y + sh.garage.h / 2;
  if (p.inCar && near(gx, gy, 90)) {
    G.garageCar = { modelId: p.inCar.model.id, color: p.inCar.color };
    const car = p.inCar;
    exitCar(p);
    car.gone = true;
    G.cars = G.cars.filter((c) => !c.gone);
    saveGame();
    G.banner = { title: 'CAR STORED', sub: 'It will be waiting in this garage.', until: G.time + 1.8 };
    return true;
  }
  if (!p.inCar && G.garageCar && near(gx, gy, 80)) {
    const car = createCar(G.garageCar.modelId, G.garageCar.color, gx, gy, -Math.PI / 2, 'parked');
    G.cars.push(car);
    G.garageCar = null;
    saveGame();
    return true;
  }
  if (!p.inCar && near(sh.x, sh.y, 46)) {
    p.hp = 100;
    saveGame();
    G.banner = { title: 'SAFEHOUSE', sub: 'Rested, healed and saved.', until: G.time + 1.6 };
    sfx.pickup();
    return true;
  }
  return false;
}

/** Wake up at the hospital after a wasted/busted screen: poorer, healed, heat gone. */
export function respawn() {
  const p = G.player;
  if (p.inCar) exitCar(p);
  p.x = G.world.hospital.x; p.y = G.world.hospital.y;
  p.hp = 100; p.armor = 0;
  G.police.heat = 0; G.police.stars = 0; G.police.heli = null; G.police.bust = 0;
  if (G.mission) { G.mission = null; }
  if (G.gig) { G.gig = null; }
  G.objective = '';
  G.screen = 'play';
}
