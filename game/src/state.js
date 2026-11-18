'use strict';
/* Azul Heat — the central game state. One plain object, G, that every
   system reads and writes; save.js serialises the persistent slice. */
AH.newState = function () {
  return {
    screen: 'title',          // title | select | play
    overlay: null,            // null | pause | map | phone
    selectIdx: 0,             // character-select cursor
    time: 0,                  // seconds since boot (drives animation)
    cam: { x: 2400, y: 600 }, // camera centre in world pixels
    player: null,             // controlled character entity (characters.js)
    partner: null,            // the other protagonist, standing in the world
    cars: [],                 // every vehicle: traffic, parked, police, player's
    peds: [],                 // pedestrians + foot police
    bullets: [],              // live projectiles (combat.js)
    parts: [],                // particles: smoke, sparks, flashes
    floaters: [],             // floating texts (+$400, WASTED, ...)
    // wanted system (police.js)
    wanted: 0, seenTimer: 99, hideTimer: 0, bustTimer: 0,
    wantedFloor: 0, roadblockTimer: 20, heli: null,
    // story & gigs
    mission: null,            // active mission runtime (story.js)
    storyDone: 0,             // index of next story mission offered
    dialogue: null,           // { lines, i, t } while a conversation runs
    gig: null, gigCooldown: 0,
    // economy (economy.js)
    cash: AH.CFG.startCash, rep: [0, 0, 0, 0, 0, 0],
    safehouses: { marinaRoom: true, oldTownFlat: false, stripSuite: false, palmVilla: false },
    stats: { stolen: 0, earned: 0, busted: 0, wasted: 0, racesWon: 0, deliveries: 0 },
    // phone (phone.js)
    messages: [], phoneTab: 0, toast: null,
    // misc presentation
    banner: null,             // { title, sub, t, dur, color }
    districtName: '', districtTimer: 0,
    muted: false, radioStation: 1,
    shake: 0,
    shotMode: null,           // set by shots.js when ?shot= is present
  };
};

let G = AH.newState();
AH.G = G;

/* Small shared presentation helpers used by several systems. */
AH.banner = function (title, sub, color, dur) {
  G.banner = { title: title, sub: sub || '', t: 0, dur: dur || 3.2, color: color || '#ffd23f' };
};
AH.floater = function (x, y, text, color) {
  G.floaters.push({ x: x, y: y, text: text, color: color || '#fff', t: 0 });
};
AH.toast = function (text) { G.toast = { text: text, t: 0 }; };
