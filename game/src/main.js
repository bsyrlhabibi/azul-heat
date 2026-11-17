// main.js — boots Azul Heat, runs the frame loop, routes input between
// screens (title, play, pause, map, phone, shop, mission cards, endings)
// and dispatches the E-key interactions the HUD prompts for.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PLACES } from './config.js';
import { G, activeRunner } from './state.js';
import { initInput, pressed, mouse, endFrameInput } from './input.js';
import { buildWorld } from './world.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { initPeds, updatePeds } from './pedestrians.js';
import { findInteract, updateRunner, enterCar, exitCar } from './characters.js';
import { updateCombat, updateFx } from './combat.js';
import { updatePolice, clearPolice, policeNearFactor } from './police.js';
import { talkToContact, startMission, updateStory } from './story.js';
import { missionById } from './missions.js';
import { updateGigs, startRace, startCourier, startRampage } from './gigs.js';
import { buyItem, useSafehouse, storeCarInGarage } from './economy.js';
import { updateCarFx, carSpeed } from './vehicles.js';
import { drawWorld, districtBannerCheck } from './render.js';
import { drawMinimap, drawMapScreen } from './minimap.js';
import { drawHUD, drawTitle, drawPause, drawCard, drawShop, drawEndScreen } from './hud.js';
import { drawPhone } from './phone.js';
import { initAudio, updateAudio, sfx } from './audio.js';
import { hasSave, loadGame, saveGame } from './save.js';
import { applyShot } from './shots.js';
import { clamp } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
G.seed = seed;
G.titleSel = 0;

buildWorld(seed);
initTraffic(seed);
initPeds(seed);
initInput(canvas);
window.addEventListener('keydown', initAudio, { once: false });
window.addEventListener('pointerdown', initAudio, { once: false });

if (params.get('shot')) applyShot(params.get('shot'));

function resetRun() {
  G.cash = 250; G.rep = {}; G.missionsDone = []; G.garage = null;
  G.mission = null; G.gig = null; G.messages = []; G.card = null; G.objective = '';
  G.stats = { earned: 0, carsStolen: 0, shots: 0 };
  clearPolice();
  const L = G.runners.lucia, M = G.runners.marco;
  Object.assign(L, { x: PLACES.carmen.x + 60, y: PLACES.carmen.y + 40, hp: 100, armor: 0, ammo: 30, car: null });
  Object.assign(M, { x: PLACES.docksDepot.x - 90, y: PLACES.docksDepot.y - 60, hp: 100, armor: 0, ammo: 30, car: null });
  G.active = 'lucia';
}

function startGame(continued) {
  if (continued) loadGame(); else resetRun();
  G.started = true;
  G.screen = 'play';
  G.district = '';
  sfx.complete();
}

function titleItems() { return hasSave() ? ['continue', 'new'] : ['new']; }

function updateTitle() {
  const items = titleItems();
  if (pressed('ArrowDown') || pressed('KeyS')) { G.titleSel = (G.titleSel + 1) % items.length; sfx.click(); }
  if (pressed('ArrowUp') || pressed('KeyW')) { G.titleSel = (G.titleSel - 1 + items.length) % items.length; sfx.click(); }
  if (pressed('Enter') || mouse.clicked) startGame(items[G.titleSel] === 'continue');
  G.cam.x = clamp(1500 + Math.sin(G.time * 0.045) * 420 - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  G.cam.y = clamp(1050 + Math.cos(G.time * 0.03) * 260 - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  updateTraffic(1 / 60); updatePeds(1 / 60);
}

function dispatchInteract() {
  const it = findInteract();
  if (!it) return;
  const r = activeRunner();
  if (it.kind === 'car') enterCar(it.car);
  else if (it.kind === 'exit') exitCar();
  else if (it.kind === 'contact') talkToContact(it.contactId);
  else if (it.kind === 'shop') { G.screen = 'shop'; G.shopAt = it.place; sfx.click(); }
  else if (it.kind === 'safehouse') useSafehouse();
  else if (it.kind === 'garageStore') storeCarInGarage();
  else if (it.kind === 'race') startRace();
  else if (it.kind === 'courier') startCourier();
  else if (it.kind === 'rampage') startRampage(r.x, r.y);
}

function updatePlay(dt) {
  const r = activeRunner();
  updateRunner(dt);
  if (G.screen !== 'play') return; // switching or dying mid-update ends the frame's play logic
  updateTraffic(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateCombat(dt);
  updateStory(dt);
  updateGigs(dt);
  districtBannerCheck();
  if (G.bannerT > 0) G.bannerT -= dt;
  const it = G.screen === 'play' ? findInteract() : null;
  G.prompt = it ? it.label : '';
  if (pressed('KeyE')) dispatchInteract();
  if (pressed('KeyT')) G.screen = 'phone';
  else if (pressed('KeyM')) G.screen = 'map';
  else if (pressed('KeyP') || pressed('Escape')) G.screen = 'pause';
  if (pressed('KeyN')) { G.muted = !G.muted; }
  if (!G.mission && !G.gig && !G.objective) G.objective = 'Find work: gold rings are contacts · M opens the map';
  // Camera follows the runner (or a staged override for screenshots).
  if (G.camOverride) { G.cam.x = G.camOverride.x; G.cam.y = G.camOverride.y; }
  else {
    G.cam.x = clamp(r.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    G.cam.y = clamp(r.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  }
}

function updateScreens(dt) {
  if (G.screen === 'pause') {
    if (pressed('KeyP') || pressed('Escape')) G.screen = 'play';
  } else if (G.screen === 'map') {
    if (pressed('KeyM') || pressed('Escape')) G.screen = 'play';
  } else if (G.screen === 'phone') {
    if (pressed('KeyT') || pressed('Escape')) G.screen = 'play';
  } else if (G.screen === 'shop') {
    if (pressed('Digit1')) buyItem(0);
    if (pressed('Digit2')) buyItem(1);
    if (pressed('Digit3')) buyItem(2);
    if (pressed('KeyE') || pressed('Escape')) G.screen = 'play';
  } else if (G.screen === 'card') {
    const card = G.card;
    if (!card) { G.screen = 'play'; return; }
    if (pressed('KeyE') || mouse.clicked) {
      G.card = null;
      if (card.kind === 'offer') startMission(missionById(card.missionId));
      else G.screen = 'play';
    } else if (pressed('Escape')) { G.card = null; G.screen = 'play'; }
  } else if (G.screen === 'wasted' || G.screen === 'busted') {
    G.deadT += dt;
    if (G.deadT > 0.7 && (pressed('Enter') || mouse.clicked)) {
      const r = activeRunner();
      if (G.screen === 'wasted') {
        G.cash = Math.max(0, G.cash - Math.round(G.cash * 0.08));
        r.x = PLACES.hospital.x; r.y = PLACES.hospital.y + 56; r.hp = 70;
        if (r.car) { r.car.driver = null; r.car = null; }
        clearPolice();
      }
      G.screen = 'play';
    }
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  G.time += dt;
  G.mouse.x = mouse.x; G.mouse.y = mouse.y;
  G.mouse.wx = mouse.x + G.cam.x; G.mouse.wy = mouse.y + G.cam.y;
  G.mouse.down = mouse.down;

  if (G.screen === 'title') updateTitle();
  else if (G.screen === 'play') updatePlay(dt);
  else updateScreens(dt);
  if (G.camOverride) { G.cam.x = G.camOverride.x; G.cam.y = G.camOverride.y; }
  if (G.screen === 'play' || G.screen === 'title') { updateFx(dt); updateCarFx(dt); }
  const r = activeRunner();
  updateAudio(dt, r.car ? carSpeed(r.car) / r.car.def.top : 0, G.screen === 'play' ? policeNearFactor() : 0);

  drawWorld(ctx);
  if (G.screen === 'map') drawMapScreen(ctx);
  else if (G.screen === 'title') drawTitle(ctx);
  else {
    if (G.screen !== 'wasted' && G.screen !== 'busted') { drawHUD(ctx); drawMinimap(ctx); }
    if (G.screen === 'pause') drawPause(ctx);
    else if (G.screen === 'phone') drawPhone(ctx);
    else if (G.screen === 'shop') drawShop(ctx);
    else if (G.screen === 'card') drawCard(ctx);
    else if (G.screen === 'wasted' || G.screen === 'busted') drawEndScreen(ctx);
  }
  endFrameInput();
}
requestAnimationFrame(frame);

// Hooks for automated playtests and screenshot tooling.
window.AZUL = {
  G,
  startGame,
  teleport(x, y) { const r = activeRunner(); r.x = x; r.y = y; if (r.car) { r.car.x = x; r.car.y = y; } },
  talkToContact,
  startMissionById(id) { const def = missionById(id); if (def) { G.active = def.who === 'both' ? G.active : def.who; startMission(def); } },
  interact() { dispatchInteract(); },
  setHeat(n) { G.wanted.heat = n; },
  saveGame,
};
