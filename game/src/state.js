// Azul Heat — state.js: the one mutable game state every module shares. Keeping it in
// a single object (never rebuilt, only reset) lets modules import each other's
// functions freely and call them at run time without import cycles biting.

export const G = {
  screen: 'title', // title | play | pause | map | phone | wasted | busted | card
  time: 0,
  seed: 7,
  rng: null,
  world: null,
  camera: { x: 0, y: 0 },
  player: null, // the active protagonist object (see characters.js)
  other: null, // the inactive protagonist, standing in the world
  cars: [],
  peds: [],
  bullets: [],
  particles: [],
  police: { heat: 0, stars: 0, heli: null, unseenFor: 0, bust: 0, spawnT: 0 },
  mission: null, // active story mission run state (story.js)
  gig: null, // active side gig run state (gigs.js)
  cash: 250,
  rep: {}, // district id -> 0..100
  ammo: 24,
  missionsDone: [],
  garageCar: null, // {modelId, color} stored at the safehouse
  district: null, // district object the player is in now
  banner: null, // {title, sub, until} big centre-screen banner
  prompt: null, // "E — ..." interaction hint for this frame
  objective: '', // current objective line for the HUD
  phoneMsg: null, // {from, text, until} toast
  card: null, // mission intro / complete card data
  radio: 0, // 0 off, 1..3 stations
  muted: false,
  started: false, // a run is in progress (title shows Continue)
  message: '', // wasted / busted explanation line
};

export function resetRun() {
  G.cars = []; G.peds = []; G.bullets = []; G.particles = [];
  G.police = { heat: 0, stars: 0, heli: null, unseenFor: 0, bust: 0, spawnT: 0 };
  G.mission = null; G.gig = null;
  G.cash = 250; G.rep = {}; G.ammo = 24; G.missionsDone = []; G.garageCar = null;
  G.objective = ''; G.banner = null; G.phoneMsg = null; G.card = null;
}
