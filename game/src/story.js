// story.js — runs the story missions: offers them at contacts, sets up
// each step (spawning the car to steal or the thugs to fight), watches
// for completion or failure, and pays out with reputation on success.

import { CONTACTS } from './config.js';
import { G, activeRunner, addFloater, addMessage } from './state.js';
import { MISSIONS } from './missions.js';
import { makeCar } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { dist } from './random.js';
import { stars } from './police.js';
import { addCash, addRep } from './economy.js';
import { saveGame } from './save.js';
import { sfx } from './audio.js';

function contactName(id) { const c = CONTACTS.find((k) => k.id === id); return c ? c.name : id; }

// The next mission this contact offers the active runner, if any.
export function missionOffer(contactId) {
  for (const def of MISSIONS) {
    if (def.contact !== contactId || G.missionsDone.includes(def.id)) continue;
    if (def.who !== 'both' && def.who !== G.active) continue;
    if (def.requires && G.missionsDone.length < def.requires) return { locked: def };
    return { def };
  }
  return null;
}

export function talkToContact(contactId) {
  if (G.mission) {
    G.card = { kind: 'chat', title: contactName(contactId), lines: ['"You have work already, mi amor. Finish it, then we talk."'] };
    G.screen = 'card';
    return;
  }
  const offer = missionOffer(contactId);
  if (!offer) {
    G.card = { kind: 'chat', title: contactName(contactId), lines: ['"Bahía Azul provides, if you keep moving. Check the map for work."'] };
    G.screen = 'card';
    return;
  }
  if (offer.locked) {
    G.card = { kind: 'chat', title: contactName(contactId), lines: [`"${offer.locked.title}" is family business — earn your name first (${G.missionsDone.length}/${offer.locked.requires} jobs done).`] };
    G.screen = 'card';
    return;
  }
  G.card = { kind: 'offer', title: offer.def.title, lines: offer.def.briefing, missionId: offer.def.id };
  G.screen = 'card';
  sfx.message();
}

export function startMission(def) {
  G.mission = { def, i: 0, step: null, data: {} };
  G.screen = 'play';
  addMessage(contactName(def.contact), `Job started: ${def.title}. Follow the gold marker.`);
  sfx.pickup();
  setupStep();
}

function setupStep() {
  const m = G.mission;
  const step = m.def.steps[m.i];
  m.step = step; m.data = {};
  if (step.t === 'timed') m.data.tLeft = step.seconds;
  if (step.t === 'steal') {
    const car = makeCar(step.carModel, step.carAt.x, step.carAt.y, step.carAt.angle, { color: step.carColor, parked: true });
    car.missionCar = true;
    G.cars.push(car);
    m.data.car = car;
  }
  if (step.t === 'deliver') m.data.car = G.mission.data.car || findMissionCar();
  if (step.t === 'fight') {
    for (let i = 0; i < step.count; i++) {
      const e = makePed(step.x + (i - (step.count - 1) / 2) * 44, step.y + ((i % 2) * 52 - 26), {});
      e.hostile = true; e.tag = m.def.id; e.hp = 100; e.speed = 104;
      e.top = '#3a3f4a'; e.bottom = '#22242c';
      G.enemies.push(e);
    }
  }
  if (step.t === 'escape' && step.heat) G.wanted.heat = Math.max(G.wanted.heat, step.heat);
  if (step.t === 'switch') m.data.startActive = G.active;
  G.objective = step.label;
  if (step.t === 'steal' && m.data.car) G.marker = { x: m.data.car.x, y: m.data.car.y, color: '#ffd23f' };
  else if (step.x !== undefined) G.marker = { x: step.x, y: step.y, color: '#ffd23f' };
  else G.marker = null;
}

function findMissionCar() { return G.cars.find((c) => c.missionCar) || null; }

function cleanupMission() {
  G.enemies = G.enemies.filter((e) => e.tag !== G.mission.def.id);
  const car = findMissionCar();
  if (car) car.missionCar = false;
  G.mission = null; G.marker = null; G.objective = '';
}

function failMission(reason) {
  const title = G.mission.def.title;
  cleanupMission();
  G.card = { kind: 'failed', title: `${title} — FAILED`, lines: [reason, 'The contact will offer the job again.'] };
  G.screen = 'card';
  sfx.fail();
}

function completeMission() {
  const def = G.mission.def;
  const r = activeRunner();
  cleanupMission();
  G.missionsDone.push(def.id);
  addCash(def.payout, r.x, r.y);
  addRep(def.district, 22);
  addMessage(contactName(def.contact), `Paid $${def.payout} for "${def.title}". Bahía Azul remembers.`);
  G.card = { kind: 'complete', title: `${def.title} — COMPLETE`, lines: [`+$${def.payout} · ${def.district} reputation up.`, G.missionsDone.length >= 6 ? 'Every job done. The city is yours, runners.' : 'More work waits at the gold markers.'] };
  G.screen = 'card';
  sfx.complete();
  saveGame();
}

export function updateStory(dt) {
  const m = G.mission;
  if (!m) return;
  const step = m.step, r = activeRunner();
  let done = false;
  if (step.t === 'goto' || step.t === 'pickup') {
    if (step.t === 'pickup' && r.car) { G.objective = step.label + ' (on foot)'; }
    else if (dist(r.x, r.y, step.x, step.y) < step.r) done = true;
  } else if (step.t === 'timed') {
    m.data.tLeft -= dt;
    G.objective = `${step.label} — ${Math.max(0, Math.ceil(m.data.tLeft))}s`;
    if (dist(r.x, r.y, step.x, step.y) < step.r) done = true;
    else if (m.data.tLeft <= 0) { failMission('Out of time. The city does not wait.'); return; }
  } else if (step.t === 'steal') {
    if (m.data.car) { G.marker = { x: m.data.car.x, y: m.data.car.y, color: '#ffd23f' }; if (r.car === m.data.car) done = true; }
  } else if (step.t === 'deliver') {
    if (r.car === m.data.car && dist(r.x, r.y, step.x, step.y) < step.r) done = true;
    else if (!m.data.car) { failMission('The car was destroyed.'); return; }
    if (m.data.car && m.data.car.dead) { failMission('The car was destroyed.'); return; }
  } else if (step.t === 'fight') {
    const left = G.enemies.filter((e) => e.tag === m.def.id && !e.down).length;
    G.objective = `${step.label} (${step.count - left}/${step.count})`;
    if (left === 0) done = true;
  } else if (step.t === 'escape') {
    if (stars() > 0) m.data.wasHot = true;
    G.objective = step.label + (m.data.wasHot ? '' : ' (heat incoming…)');
    if (m.data.wasHot && stars() === 0) done = true;
  } else if (step.t === 'switch') {
    G.objective = step.label;
    if (G.active !== m.data.startActive) done = true;
  }
  if (done) {
    sfx.pickup();
    addFloater(r.x, r.y - 28, 'OBJECTIVE DONE', '#7bf1a8');
    m.i++;
    if (m.i >= m.def.steps.length) completeMission();
    else setupStep();
  }
}
