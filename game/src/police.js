// Azul Heat — police.js: the wanted system. Crimes add heat (more when a unit
// witnesses them); heat becomes one to five stars. Patrol cars spawn off-screen and
// pursue, roadblocks wait across the road at three stars, and at four a helicopter
// holds its searchlight on you — inside the light your heat never cools. Break
// sight, swap cars, and the stars fade.

import { POLICE_COLOR } from './config.js';
import { G } from './state.js';
import { createCar, updateCar } from './vehicles.js';
import { lineOfSight, randomRoadPoint } from './world.js';
import { makeRng } from './random.js';
import { damagePlayer } from './combat.js';

const CRIMES = { carjack: 26, assault: 18, murder: 48, shots: 12, hitcar: 9, mission: 30 };
const rng = makeRng(777);
let lastKnown = null, swapCool = 0;

export function starsFor(heat) { return heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(heat / 45)); }

export function policeSeesPlayer() {
  const p = G.player; if (!p) return false;
  const pos = p.inCar || p;
  if (G.police.heli && Math.hypot(G.police.heli.lx - pos.x, G.police.heli.ly - pos.y) < 125) return true;
  for (const car of G.cars) {
    if (car.kind !== 'police' || car.hp <= 0) continue;
    const d = Math.hypot(car.x - pos.x, car.y - pos.y);
    if (d < 560 && lineOfSight(G.world, car.x, car.y, pos.x, pos.y)) return true;
  }
  return false;
}

export function addCrime(kind) {
  const value = CRIMES[kind] || 10;
  const seen = policeSeesPlayer();
  G.police.heat = Math.min(230, G.police.heat + value * (seen ? 1 : 0.45));
  G.police.stars = starsFor(G.police.heat);
  if (G.police.stars > 0) { const p = G.player; lastKnown = { x: (p.inCar || p).x, y: (p.inCar || p).y }; }
}

/** Swapping into a fresh car with no unit watching throws off the trail. */
export function noteCarSwap() {
  if (G.police.heat > 0 && !policeSeesPlayer()) { G.police.unseenFor += 4; swapCool = 10; }
}

function spawnPatrol() {
  const p = G.player; if (!p) return;
  const pos = p.inCar || p;
  for (let tries = 0; tries < 8; tries++) {
    const pt = randomRoadPoint(rng);
    const d = Math.hypot(pt.x - pos.x, pt.y - pos.y);
    if (d < 640 || d > 980) continue;
    const car = createCar('sedan', POLICE_COLOR, pt.x, pt.y, Math.atan2(pos.y - pt.y, pos.x - pt.x), 'police');
    car.driver = 'police';
    G.cars.push(car);
    return;
  }
}

function makeRoadblock() {
  const p = G.player; if (!p || !p.inCar) return;
  clearRoadblock();
  const car = p.inCar;
  const ahead = { x: car.x + Math.cos(car.angle) * 430, y: car.y + Math.sin(car.angle) * 430 };
  for (const off of [-26, 26]) {
    const b = createCar('sedan', POLICE_COLOR, ahead.x + Math.cos(car.angle + Math.PI / 2) * off, ahead.y + Math.sin(car.angle + Math.PI / 2) * off, car.angle + Math.PI / 2, 'police');
    b.roadblock = true;
    G.cars.push(b);
  }
}

function clearRoadblock() {
  for (const car of G.cars) if (car.roadblock) car.gone = true;
  G.cars = G.cars.filter((c) => !c.gone);
}

export function updatePolice(dt) {
  const pol = G.police, p = G.player;
  if (!p) return;
  const pos = p.inCar || p;
  swapCool = Math.max(0, swapCool - dt);
  const seen = policeSeesPlayer();
  if (seen) { pol.unseenFor = 0; lastKnown = { x: pos.x, y: pos.y }; }
  else pol.unseenFor += dt;
  if (pol.unseenFor > 5 && pol.heat > 0) {
    pol.heat = Math.max(0, pol.heat - dt * (swapCool > 0 ? 13 : 6.5));
    pol.stars = starsFor(pol.heat);
    if (pol.heat === 0) { clearRoadblock(); pol.heli = null; }
  }
  const want = pol.stars === 0 ? 0 : pol.stars + 1;
  const active = G.cars.filter((c) => c.kind === 'police' && !c.roadblock);
  pol.spawnT -= dt;
  if (active.length < want && pol.spawnT <= 0) { spawnPatrol(); pol.spawnT = 2.2; }
  if (pol.stars >= 3 && p.inCar && !G.cars.some((c) => c.roadblock)) makeRoadblock();
  if (pol.stars < 3) clearRoadblock();
  // Helicopter at four stars and up.
  if (pol.stars >= 4) {
    if (!pol.heli) pol.heli = { x: pos.x + 500, y: pos.y - 500, lx: pos.x, ly: pos.y };
    const h = pol.heli;
    const d = Math.hypot(pos.x - h.x, pos.y - h.y);
    if (d > 30) { h.x += ((pos.x - h.x) / d) * 265 * dt; h.y += ((pos.y - h.y) / d) * 265 * dt; }
    h.lx += (pos.x - h.lx) * Math.min(1, dt * 1.6);
    h.ly += (pos.y - h.ly) * Math.min(1, dt * 1.6);
  } else pol.heli = null;
  // Pursuit driving.
  pol.siren = false;
  for (const car of active) {
    const d = Math.hypot(car.x - pos.x, car.y - pos.y);
    if (d < 900) pol.siren = true;
    if (d > 1700 && pol.stars === 0) { car.gone = true; continue; }
    if (car.hp <= 0) continue;
    const target = seen || !lastKnown ? pos : lastKnown;
    let tx = target.x, ty = target.y;
    if (p.inCar) { tx += Math.cos(p.inCar.angle) * p.inCar.speed * 0.45; ty += Math.sin(p.inCar.angle) * p.inCar.speed * 0.45; }
    const want2 = Math.atan2(ty - car.y, tx - car.x);
    let diff = want2 - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    let throttle = 1;
    if (!p.inCar && d < 52) throttle = 0; // pull up beside a runner on foot
    if (Math.abs(diff) > 2.4) throttle = -0.7; // turned around: reverse out
    updateCar(car, { throttle, steer: Math.max(-1, Math.min(1, diff * 2.6)), handbrake: Math.abs(diff) > 1.9 }, dt);
    // Ramming a car hurts its driver a little; being boxed in on foot busts you.
    if (p.inCar && d < 40 && Math.abs(car.speed) > 60) damagePlayer(2.2, car.x, car.y);
  }
  if (!p.inCar && pol.stars > 0) {
    const near = active.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 58);
    if (near && Math.abs(p.x) >= 0) pol.bust = Math.min(1, pol.bust + dt / 2.4);
    else pol.bust = Math.max(0, pol.bust - dt * 0.7);
    if (pol.bust >= 1 && G.screen === 'play') {
      pol.bust = 0; pol.heat = 0; pol.stars = 0;
      G.screen = 'busted';
      G.message = 'The police boxed you in.';
      G.cash = Math.max(0, G.cash - 150);
    }
  } else pol.bust = Math.max(0, pol.bust - dt);
  G.cars = G.cars.filter((c) => !c.gone);
}

/** The helicopter and its searchlight, drawn above everything else. */
export function drawHeli(c) {
  const h = G.police.heli;
  if (!h) return;
  const p = G.player, pos = p.inCar || p;
  const lit = Math.hypot(h.lx - pos.x, h.ly - pos.y) < 125;
  c.save();
  const grad = c.createRadialGradient(h.lx, h.ly, 10, h.lx, h.ly, 130);
  grad.addColorStop(0, lit ? 'rgba(255,244,190,0.42)' : 'rgba(255,244,190,0.25)');
  grad.addColorStop(1, 'rgba(255,244,190,0)');
  c.fillStyle = grad;
  c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.lx - 95, h.ly + 60); c.lineTo(h.lx + 95, h.ly + 60); c.closePath(); c.fill();
  c.beginPath(); c.arc(h.lx, h.ly, 118, 0, Math.PI * 2); c.fill();
  // Body, offset up-left so its shadow reads as altitude.
  c.fillStyle = 'rgba(40,16,40,0.25)';
  c.beginPath(); c.ellipse(h.x + 26, h.y + 34, 30, 13, 0.4, 0, Math.PI * 2); c.fill();
  c.translate(h.x, h.y); c.rotate(Math.atan2(pos.y - h.y, pos.x - h.x));
  c.fillStyle = '#20242c';
  c.beginPath(); c.roundRect(-24, -10, 48, 20, 9); c.fill();
  c.fillRect(16, -3, 26, 6);
  c.fillStyle = '#7fd4e8'; c.beginPath(); c.roundRect(8, -7, 12, 14, 4); c.fill();
  const sweep = Math.sin(G.time * 28) * 4;
  c.strokeStyle = 'rgba(20,20,20,0.85)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -34 + sweep); c.lineTo(0, 34 - sweep); c.stroke();
  c.fillStyle = Math.floor(G.time * 5) % 2 ? '#ff3b30' : '#7a1d18';
  c.beginPath(); c.arc(-18, 0, 3.4, 0, Math.PI * 2); c.fill();
  c.restore();
}
