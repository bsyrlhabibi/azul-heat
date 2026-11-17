// Azul Heat — main.js: boots the game and runs the loop. Owns the screens (title,
// play, pause, map, phone, mission cards, wasted, busted), the camera, the
// interaction chain behind the E key, and the order every system updates in.

import { WORLD_W, WORLD_H, CONTROLS_TEXT } from './config.js';
import { G, resetRun } from './state.js';
import { urlSeed, urlShot } from './random.js';
import { initInput, pressed, mouse, endFrameInput } from './input.js';
import { buildWorld, districtAt } from './world.js';
import { makeRunner, drawPerson, updatePlayer, updateOther, switchRunner, activePos, vehiclePrompt, tryVehicleInteract, RUNNERS } from './characters.js';
import { populateCars, updateTraffic } from './traffic.js';
import { populatePeds, updatePeds } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateCombat, updateBullets } from './combat.js';
import { spawnContacts, updateStory, contactPrompt, tryStoryInteract, beginSteps } from './story.js';
import { updateGigs, gigPrompt, tryGigInteract } from './gigs.js';
import { economyPrompt, tryEconomyInteract, respawn } from './economy.js';
import { hasSave, saveGame, loadSave, clearSave } from './save.js';
import { drawScene } from './render.js';
import { drawHud } from './hud.js';
import { drawMapScreen } from './minimap.js';
import { drawPhone, wrapText } from './phone.js';
import { initAudio, updateAudio, sfx } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const c = canvas.getContext('2d');
let vw = 0, vh = 0;

function resize() {
  vw = canvas.width = innerWidth;
  vh = canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();
initInput(canvas);
addEventListener('pointerdown', initAudio);
addEventListener('keydown', initAudio);

export function newGame(seed, cont = false) {
  G.seed = seed;
  G.world = buildWorld(seed);
  resetRun();
  const s = G.world.spawns;
  G.player = makeRunner('lucia', s.lucia.x, s.lucia.y);
  G.other = makeRunner('marco', s.marco.x, s.marco.y);
  populateCars();
  spawnContacts();
  G.district = districtAt(G.player.x, G.player.y);
  if (cont) {
    const data = loadSave();
    if (data && data.runner === 'marco') { const t = G.player; G.player = G.other; G.other = t; }
  }
  G.started = true;
}

// --- boot: a living city behind the title screen, or a staged shot scene.
newGame(urlSeed());
const shot = urlShot();
if (shot) stageShot(shot);
else G.screen = 'title';
window.__azul = { G, newGame, stageShot };

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;
  update(dt);
  draw();
  endFrameInput();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function update(dt) {
  if (G.screen === 'title') {
    // The city idles behind the menu: traffic rolls, people stroll.
    G.camera.x = 1540 + Math.sin(G.time * 0.05) * 420 - vw / 2;
    G.camera.y = 1080 + Math.cos(G.time * 0.037) * 260 - vh / 2;
    updateTraffic(dt); populatePeds(dt); updatePeds(dt);
    return;
  }
  if (G.screen === 'phone' && (pressed.t || pressed.Escape)) { G.screen = 'play'; return; }
  if (G.screen === 'map' && (pressed.m || pressed.Escape)) { G.screen = 'play'; return; }
  if (G.screen === 'pause' && (pressed.p || pressed.Escape)) { G.screen = 'play'; return; }
  if (G.screen !== 'play') return;
  if (pressed.Tab) switchRunner();
  if (pressed.e) {
    tryStoryInteract() || tryGigInteract() || tryVehicleInteract() || tryEconomyInteract();
  }
  if (pressed.t) { G.screen = 'phone'; return; }
  if (pressed.m) { G.screen = 'map'; return; }
  if (pressed.p || pressed.Escape) { G.screen = 'pause'; return; }
  if (pressed.n) G.muted = !G.muted;
  updatePlayer(dt);
  updateOther(dt);
  updateTraffic(dt);
  populatePeds(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateCombat(dt);
  updateBullets(dt);
  updateStory(dt);
  updateGigs(dt);
  for (const pt of G.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
  G.particles = G.particles.filter((pt) => pt.t < pt.life);
  G.prompt = contactPrompt() || gigPrompt() || vehiclePrompt() || economyPrompt();
  const pos = activePos();
  const d = districtAt(pos.x, pos.y);
  if (G.district && d.id !== G.district.id && !shot) {
    G.banner = { title: d.name, sub: 'Bahía Azul', until: G.time + 2.1 };
  }
  G.district = d;
  G.camera.x = Math.max(0, Math.min(WORLD_W - vw, pos.x - vw / 2));
  G.camera.y = Math.max(0, Math.min(WORLD_H - vh, pos.y - vh / 2));
  const car = G.player.inCar;
  updateAudio(dt, car ? Math.abs(car.speed) / car.model.speed : 0, !!car, !!G.police.siren && G.police.stars > 0);
}

function button(x, y, w, h, label, accent = '#ffd75e') {
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  c.save();
  c.fillStyle = hover ? accent : 'rgba(16,12,26,0.85)';
  c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill();
  c.fillStyle = hover ? '#1c1026' : '#f2e9d8';
  c.font = 'bold 17px system-ui'; c.textAlign = 'center';
  c.fillText(label, x + w / 2, y + h / 2 + 6);
  c.restore();
  return hover && mouse.clicked;
}

function draw() {
  c.clearRect(0, 0, vw, vh);
  if (G.screen === 'map') { drawMapScreen(c, vw, vh); return; }
  drawScene(c, vw, vh);
  if (G.screen === 'play') drawHud(c, vw, vh);
  else if (G.screen === 'title') drawTitle();
  else if (G.screen === 'pause') { drawHud(c, vw, vh); drawPause(); }
  else if (G.screen === 'phone') { drawHud(c, vw, vh); drawPhone(c, vw, vh); }
  else if (G.screen === 'card') { drawHud(c, vw, vh); drawCard(); }
  else if (G.screen === 'wasted') drawEndScreen('WASTED', '#e74c3c', `${G.message} The hospital patched you up — $100.`);
  else if (G.screen === 'busted') drawEndScreen('BUSTED', '#4da3ff', `${G.message} You paid a $150 fine.`);
}

function drawTitle() {
  c.save();
  const grad = c.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, 'rgba(26,8,34,0.55)');
  grad.addColorStop(0.55, 'rgba(26,8,34,0.25)');
  grad.addColorStop(1, 'rgba(26,8,34,0.72)');
  c.fillStyle = grad; c.fillRect(0, 0, vw, vh);
  c.textAlign = 'center';
  const lg = c.createLinearGradient(vw / 2 - 260, 0, vw / 2 + 260, 0);
  lg.addColorStop(0, '#ffd75e'); lg.addColorStop(0.5, '#ff5e8a'); lg.addColorStop(1, '#4dd0e1');
  c.fillStyle = lg;
  c.font = 'bold 92px system-ui';
  c.shadowColor = 'rgba(255,60,140,0.55)'; c.shadowBlur = 30;
  c.fillText('AZUL HEAT', vw / 2, vh * 0.30);
  c.shadowBlur = 0;
  c.fillStyle = '#fff';
  c.font = 'bold 21px system-ui';
  c.fillText('T W O   R U N N E R S', vw / 2, vh * 0.30 + 40);
  c.font = '15px system-ui'; c.fillStyle = '#ffe9a8';
  c.fillText('An open-world crime game in the fictional sunset city of Bahía Azul — five districts, two runners, one long golden hour.', vw / 2, vh * 0.30 + 68);
  // Character cards.
  const cardW = 252, cardH = 118, y0 = vh * 0.30 + 96;
  [RUNNERS.lucia, RUNNERS.marco].forEach((r, i) => {
    const x = vw / 2 + (i === 0 ? -cardW - 14 : 14);
    c.fillStyle = 'rgba(14,10,24,0.82)';
    c.beginPath(); c.roundRect(x, y0, cardW, cardH, 12); c.fill();
    c.save(); c.translate(x + 42, y0 + 88); c.scale(2.1, 2.1);
    drawPerson(c, { ...r, x: 0, y: 0, walk: 0, moving: false });
    c.restore();
    c.fillStyle = '#ffd75e'; c.font = 'bold 16px system-ui'; c.textAlign = 'left';
    c.fillText(r.name, x + 76, y0 + 38);
    c.fillStyle = '#dfe9ee'; c.font = '12.5px system-ui';
    wrapText(c, r.role, cardW - 92).forEach((line, j) => c.fillText(line, x + 76, y0 + 58 + j * 16));
    c.fillStyle = '#9fb4c0'; c.font = '11.5px system-ui';
    c.fillText(i === 0 ? 'Starts at the Marina' : 'Starts at the Docks', x + 76, y0 + 100);
  });
  const bw = 230, bx = vw / 2 - bw / 2;
  let by = y0 + cardH + 26;
  if (hasSave()) {
    if (button(bx, by, bw, 46, 'CONTINUE')) { newGame(urlSeed(), true); G.screen = 'play'; sfx.jingle(); }
    by += 58;
    if (button(bx, by, bw, 46, 'NEW GAME', '#ff5e8a')) { clearSave(); newGame(urlSeed()); G.screen = 'play'; }
  } else if (button(bx, by, bw, 46, 'NEW GAME')) { newGame(urlSeed()); G.screen = 'play'; }
  c.fillStyle = 'rgba(230,238,242,0.85)'; c.font = '12.5px system-ui'; c.textAlign = 'center';
  CONTROLS_TEXT.forEach((line, i) => c.fillText(line, vw / 2, by + 78 + i * 17));
  c.restore();
}

function drawPause() {
  c.save();
  c.fillStyle = 'rgba(10,6,16,0.62)'; c.fillRect(0, 0, vw, vh);
  c.textAlign = 'center';
  c.fillStyle = '#ffd75e'; c.font = 'bold 34px system-ui';
  c.fillText('PAUSED', vw / 2, vh * 0.30);
  const bw = 230, bx = vw / 2 - bw / 2;
  if (button(bx, vh * 0.36, bw, 44, 'RESUME')) G.screen = 'play';
  if (button(bx, vh * 0.36 + 54, bw, 44, 'SAVE GAME')) { saveGame(); G.banner = { title: 'SAVED', sub: 'Progress written to this browser.', until: G.time + 1.6 }; G.screen = 'play'; }
  if (button(bx, vh * 0.36 + 108, bw, 44, G.muted ? 'UNMUTE' : 'MUTE')) G.muted = !G.muted;
  if (button(bx, vh * 0.36 + 162, bw, 44, 'QUIT TO TITLE', '#ff5e8a')) { G.screen = 'title'; }
  c.fillStyle = 'rgba(230,238,242,0.9)'; c.font = '13px system-ui';
  CONTROLS_TEXT.forEach((line, i) => c.fillText(line, vw / 2, vh * 0.36 + 238 + i * 18));
  c.restore();
}

let seenCard = null, cardSeenAt = 0, endSeenAt = 0, seenScreen = '';

function drawCard() {
  const card = G.card;
  if (!card) { G.screen = 'play'; return; }
  if (card !== seenCard) { seenCard = card; cardSeenAt = G.time; }
  c.save();
  c.fillStyle = 'rgba(10,6,16,0.55)'; c.fillRect(0, 0, vw, vh);
  const w = 620;
  c.font = '14.5px system-ui'; // measure with the font the lines will be drawn in
  const wrappedCount = card.lines.reduce((n, line) => n + wrapText(c, line, w - 52).length, 0);
  const hgt = 142 + wrappedCount * 22 + card.lines.length * 4, x = (vw - w) / 2, y = vh * 0.30;
  c.fillStyle = '#171226';
  c.beginPath(); c.roundRect(x, y, w, hgt, 14); c.fill();
  c.strokeStyle = card.kind === 'complete' ? '#8dff9a' : card.kind === 'fail' ? '#ff5252' : '#ffd75e';
  c.lineWidth = 2; c.stroke();
  c.fillStyle = c.strokeStyle; c.font = 'bold 21px system-ui'; c.textAlign = 'left';
  c.fillText(card.title, x + 26, y + 40);
  c.fillStyle = '#9fb4c0'; c.font = '12.5px system-ui';
  c.fillText(card.contact ? `— ${card.contact}` : '', x + 26, y + 60);
  c.fillStyle = '#eef4f6'; c.font = '14.5px system-ui';
  let ly = y + 88;
  for (const line of card.lines) {
    for (const sub of wrapText(c, line, w - 52)) { c.fillText(sub, x + 26, ly); ly += 22; }
    ly += 4;
  }
  c.fillStyle = '#7e93a0'; c.font = '12px system-ui';
  c.fillText(card.kind === 'intro' ? 'Click or press E — take the job' : 'Click or press E — back to the street', x + 26, y + hgt - 14);
  c.restore();
  if (G.time - cardSeenAt > 0.35 && (mouse.clicked || pressed.e || pressed.Enter)) {
    const wasIntro = card.kind === 'intro';
    G.card = null;
    seenCard = null;
    G.screen = 'play';
    if (wasIntro) beginSteps();
  }
}

function drawEndScreen(word, color, sub) {
  if (seenScreen !== G.screen) { seenScreen = G.screen; endSeenAt = G.time; }
  c.save();
  c.fillStyle = color === '#e74c3c' ? 'rgba(80,4,10,0.45)' : 'rgba(6,16,50,0.45)';
  c.fillRect(0, 0, vw, vh);
  c.textAlign = 'center';
  c.fillStyle = color; c.font = 'bold 84px system-ui';
  c.shadowColor = color; c.shadowBlur = 26;
  c.fillText(word, vw / 2, vh * 0.44);
  c.shadowBlur = 0;
  c.fillStyle = '#fff'; c.font = '16px system-ui';
  c.fillText(sub, vw / 2, vh * 0.44 + 38);
  c.fillStyle = '#cfe0e8'; c.font = '13px system-ui';
  c.fillText('Click or press Enter — wake up at the hospital', vw / 2, vh * 0.44 + 64);
  c.restore();
  if (G.time - endSeenAt > 0.6 && (mouse.clicked || pressed.Enter)) {
    if (G.screen === 'wasted') G.cash = Math.max(0, G.cash - 100);
    seenScreen = '';
    respawn();
  }
}
