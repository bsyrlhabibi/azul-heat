// state.js — the one shared game state object every module reads and writes.
// Keeping it in a single place keeps the single-job modules free of cycles.

import { RUNNERS, PLACES } from './config.js';

export const G = {
  screen: 'title',        // title | play | pause | map | phone | shop | card | wasted | busted
  time: 0,
  seed: 7,
  started: false,
  cam: { x: 0, y: 0 },
  mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false },

  // The active runner and the partner waiting where they were left.
  active: 'lucia',
  runners: {
    lucia: { x: PLACES.carmen.x + 60, y: PLACES.carmen.y + 40, angle: -Math.PI / 2, hp: 100, armor: 0, ammo: 30, car: null, walk: 0 },
    marco: { x: PLACES.docksDepot.x - 90, y: PLACES.docksDepot.y - 60, angle: Math.PI, hp: 100, armor: 0, ammo: 30, car: null, walk: 0 },
  },

  cars: [],               // traffic, parked, police and the player's ride
  peds: [],               // ambient pedestrians
  enemies: [],            // hostile thugs spawned by missions and gigs
  tracers: [],            // gunfire lines, short-lived
  particles: [],          // sparks, smoke, splashes of colour
  floaters: [],           // floating text (+$400, WASTED is a screen, not this)

  wanted: { heat: 0, seen: false, unseenFor: 0, bust: 0, lastCrime: -99 },
  police: { units: [], heli: { active: false, x: 0, y: 0, angle: 0, lightX: 0, lightY: 0 }, roadblockFor: 0 },

  cash: 250,
  rep: {},                // district name -> 0..100
  missionsDone: [],
  mission: null,          // live story mission { def, stepIndex, step, data }
  gig: null,              // live side gig { kind, ... }
  garage: null,           // { model, color, hp } stored at the safehouse
  messages: [],           // phone messages { from, text, t }
  card: null,             // modal card { kind, title, lines, missionId }
  shopAt: null,           // place key of the gun shop in use
  prompt: '',             // contextual "E — ..." hint for the HUD
  objective: '',          // current objective line for the HUD
  marker: null,           // world-space objective marker { x, y, color }
  district: 'The Marina',
  bannerT: 0,             // district banner fade timer
  radio: 0,               // 0 off, 1..3 stations
  muted: false,
  shake: 0,
  deadT: 0,               // timer on wasted/busted screens
  stats: { earned: 0, carsStolen: 0, shots: 0 },
};

export function activeRunner() { return G.runners[G.active]; }
export function activeDef() { return RUNNERS[G.active]; }
export function otherRunnerId() { return G.active === 'lucia' ? 'marco' : 'lucia'; }
export function addFloater(x, y, text, color) {
  G.floaters.push({ x, y, text, color: color || '#ffd23f', t: 0 });
  if (G.floaters.length > 24) G.floaters.shift();
}
export function addMessage(from, text) {
  G.messages.push({ from, text, t: G.time });
  if (G.messages.length > 30) G.messages.shift();
}
