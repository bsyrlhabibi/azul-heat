// Azul Heat — story.js: runs the missions in missions.js. Talking to a contact
// opens their intro card; accepting starts a chain of steps — drive here, steal
// that, beat those collectors, lose the police, switch runners — each with its
// marker, timer and heat, until the last one pays out and the contact texts you.

import { G } from './state.js';
import { MISSIONS, CONTACTS } from './missions.js';
import { spawnPed } from './pedestrians.js';
import { createCar } from './vehicles.js';
import { starsFor } from './police.js';
import { addCash, addRep } from './economy.js';
import { sendMessage } from './phone.js';
import { saveGame } from './save.js';
import { sfx } from './audio.js';

export function spawnContacts() {
  for (const ct of Object.values(CONTACTS)) {
    spawnPed(ct.x, ct.y, { kind: 'contact', name: ct.name, shirt: ct.shirt });
  }
}

export function missionAvailable(def) {
  if (G.missionsDone.includes(def.id)) return false;
  if (def.runner !== 'any' && def.runner !== G.player.id) return false;
  if (def.requires && !def.requires.every((r) => G.missionsDone.includes(r))) return false;
  return true;
}

export function contactPrompt() {
  if (G.mission || G.gig) return null;
  for (const def of MISSIONS) {
    if (!missionAvailable(def)) continue;
    const ct = CONTACTS[def.contact];
    if (Math.hypot(G.player.x - ct.x, G.player.y - ct.y) < 54) {
      return `E — talk to ${ct.name}: “${def.title}”`;
    }
  }
  return null;
}

export function tryStoryInteract() {
  if (G.mission || G.gig) return false;
  for (const def of MISSIONS) {
    if (!missionAvailable(def)) continue;
    const ct = CONTACTS[def.contact];
    if (Math.hypot(G.player.x - ct.x, G.player.y - ct.y) < 54) {
      G.mission = { def, step: -1, t: 0, car: null, thugs: [], fightSpawned: false, stepFrom: G.player.id };
      G.card = { kind: 'intro', title: def.title, contact: ct.name, lines: def.intro };
      G.screen = 'card';
      sfx.click();
      return true;
    }
  }
  return false;
}

/** Called when the intro card is dismissed: the first step begins. */
export function beginSteps() {
  if (!G.mission) return;
  G.mission.step = 0;
  startStep();
  if (G.mission.def.id === 'finale') G.other.follow = true;
}

function startStep() {
  const m = G.mission, step = m.def.steps[m.step];
  m.t = step.time || 0;
  m.fightSpawned = false;
  m.stepFrom = G.player.id;
  if (step.heat) {
    G.police.heat = Math.max(G.police.heat, (step.heat - 1) * 45 + 22);
    G.police.stars = starsFor(G.police.heat);
  }
  if (step.type === 'steal' && !m.car) {
    m.car = createCar(step.model, step.color, step.x, step.y, Math.PI / 2, 'parked');
    G.cars.push(m.car);
  }
  G.objective = step.label;
}

function failMission(reason) {
  const m = G.mission;
  G.mission = null;
  G.other.follow = false;
  G.objective = '';
  G.card = { kind: 'fail', title: `${m.def.title} — FAILED`, contact: CONTACTS[m.def.contact].name, lines: [reason, 'Come back and try again.'] };
  G.screen = 'card';
  sendMessage(CONTACTS[m.def.contact].name, 'That went badly. Come see me and we try again.');
  sfx.fail();
}

function completeMission() {
  const m = G.mission, def = m.def;
  G.mission = null;
  G.other.follow = false;
  G.objective = '';
  G.missionsDone.push(def.id);
  addCash(def.payout);
  addRep(G.player.x, G.player.y, 14);
  saveGame();
  G.card = { kind: 'complete', title: `${def.title} — COMPLETE`, contact: CONTACTS[def.contact].name, lines: [`Paid: $${def.payout}. Bahía Azul remembers who runs for it.`, def.id === 'finale' ? 'The city is yours, runners. (Story complete — gigs and free roam continue.)' : 'Check your phone — more work is coming.'] };
  G.screen = 'card';
  sendMessage(CONTACTS[def.contact].name, def.id === 'finale' ? 'It is done. Both of you — familia, always.' : 'Good work. You will hear from me again.');
  sfx.jingle();
}

function advance() {
  const m = G.mission;
  m.step++;
  if (m.step >= m.def.steps.length) completeMission();
  else startStep();
}

export function updateStory(dt) {
  const m = G.mission;
  if (!m || m.step < 0 || G.screen !== 'play') return;
  const step = m.def.steps[m.step];
  const p = G.player, pos = p.inCar || p;
  if (step.time) {
    m.t -= dt;
    G.objective = `${step.label} — ${Math.max(0, Math.ceil(m.t))}s`;
    if (m.t <= 0) { failMission('Out of time.'); return; }
  }
  if (step.fight && !m.fightSpawned && Math.hypot(pos.x - step.x, pos.y - step.y) < 170) {
    m.fightSpawned = true;
    for (let i = 0; i < step.fight; i++) {
      m.thugs.push(spawnPed(step.x + (i ? 30 : -30), step.y + 18, { kind: 'thug', shirt: '#37474f' }));
    }
    G.objective = 'Beat the collectors!';
  }
  const dist = Math.hypot(pos.x - step.x, pos.y - step.y);
  switch (step.type) {
    case 'goto':
      if (dist < step.r && (!step.fight || m.thugs.every((t) => t.dead))) advance();
      break;
    case 'steal':
      if (m.car && p.inCar === m.car) { addCrimeHeat(1); advance(); }
      else if (m.car) G.objective = step.label;
      break;
    case 'escape':
      if (G.police.stars === 0) advance();
      else G.objective = `${step.label} (${G.police.stars}★)`;
      break;
    case 'switch':
      if (G.player.id !== m.stepFrom) advance();
      break;
  }
}

function addCrimeHeat(stars) {
  G.police.heat = Math.max(G.police.heat, (stars - 1) * 45 + 22);
  G.police.stars = starsFor(G.police.heat);
}

/** Where the HUD/minimap should point: the current step's target, if it has one. */
export function missionMarker() {
  const m = G.mission;
  if (!m || m.step < 0) return null;
  const step = m.def.steps[m.step];
  if (step.type === 'steal' && m.car) return { x: m.car.x, y: m.car.y };
  if (step.type === 'escape' || step.type === 'switch') return null;
  return { x: step.x, y: step.y };
}

/** Contact markers for missions the active runner could take right now. */
export function offerMarkers() {
  if (G.mission) return [];
  const out = [];
  for (const def of MISSIONS) {
    if (missionAvailable(def)) out.push({ x: CONTACTS[def.contact].x, y: CONTACTS[def.contact].y });
  }
  return out;
}
