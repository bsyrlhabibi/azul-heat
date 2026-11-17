// config.js — every constant that shapes Bahía Azul: world size, roads,
// districts, landmarks, car models, protagonists and the control scheme.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const WATER_X = 150;          // the sea fills everything west of this line
export const SAND_X = 235;           // beach sand between the sea and the promenade
export const ROAD_W = 96;
export const ROADS_V = [560, 1100, 1620, 2150, 2670];
export const ROADS_H = [575, 1150, 1725];

// Six districts tile the city; roads run along most of their borders.
export const DISTRICTS = [
  { name: 'The Marina',  x: 0,    y: 0,    w: 1100, h: 1150, ground: '#8a7a5c', rep: 0 },
  { name: 'Old Town',    x: 1100, y: 0,    w: 1050, h: 1150, ground: '#7d6a58', rep: 0 },
  { name: 'Neon Strip',  x: 2150, y: 0,    w: 1050, h: 1150, ground: '#6f5f6e', rep: 0 },
  { name: 'Palm Hills',  x: 0,    y: 1150, w: 1100, h: 1250, ground: '#5f7350', rep: 0 },
  { name: 'Midtown',     x: 1100, y: 1150, w: 1050, h: 1250, ground: '#77685c', rep: 0 },
  { name: 'The Docks',   x: 2150, y: 1150, w: 1050, h: 1250, ground: '#6b6257', rep: 0 },
];

// Fixed places the story and systems hang on. World generation keeps them clear.
export const PLACES = {
  pierEnd:     { x: 120,  y: 520,  label: 'Marina Pier' },
  carmen:      { x: 400,  y: 830,  label: 'Tía Carmen' },
  contador:    { x: 1330, y: 830,  label: 'El Contador' },
  prisma:      { x: 2420, y: 830,  label: 'DJ Prisma' },
  safehouse:   { x: 430,  y: 2030, label: 'Safehouse' },
  garage:      { x: 520,  y: 2030, label: 'Garage' },
  hospital:    { x: 880,  y: 1330, label: 'Hospital' },
  policeHQ:    { x: 1500, y: 1300, label: 'Police HQ' },
  gunshopA:    { x: 1330, y: 1480, label: 'Ammu-Nación' },
  gunshopB:    { x: 2560, y: 2030, label: 'Ammu-Nación' },
  raceStart:   { x: 2920, y: 575,  label: 'Street Race' },
  docksDepot:  { x: 2920, y: 2080, label: 'Docks Depot' },
  stripPark:   { x: 2560, y: 300,  label: 'Casino Perla' },
  oldtownYard: { x: 1900, y: 300,  label: 'Old Town Yard' },
};

// The two runners. Lucía drives sweeter; Marco's rides take more punishment.
export const RUNNERS = {
  lucia: {
    id: 'lucia', name: 'Lucía Ferro', role: 'Courier — born on these streets',
    handling: 1.18, durability: 1.0, footSpeed: 1.06,
    skin: '#a0663a', hair: '#1c1210', top: '#0fb5a8', bottom: '#27324a', accent: '#ffd23f',
  },
  marco: {
    id: 'marco', name: 'Marco Reyes', role: 'Ex-mechanic — nothing breaks on his watch',
    handling: 1.0, durability: 0.62, footSpeed: 0.97,
    skin: '#7c4b26', hair: '#0e0c0a', top: '#e8873a', bottom: '#3a3230', accent: '#f4f1e6',
  },
};

export const CONTACTS = [
  { id: 'carmen',   name: 'Tía Carmen',  place: 'carmen',   skin: '#8a5a30', hair: '#e8e2d4', top: '#c9403d', bottom: '#4a2f35' },
  { id: 'contador', name: 'El Contador', place: 'contador', skin: '#6e4525', hair: '#14100c', top: '#31456b', bottom: '#22242c' },
  { id: 'prisma',   name: 'DJ Prisma',   place: 'prisma',   skin: '#b57a4a', hair: '#3b1650', top: '#b03ae0', bottom: '#191926' },
];

// Car models: size, pace and toughness. Police use their own livery of the sedan.
export const CAR_MODELS = {
  comet:   { name: 'Comet GT',   w: 50, h: 24, accel: 340, top: 335, grip: 0.90, hp: 90,  colors: ['#e63946', '#ffb703', '#00b4d8', '#9d4edd'] },
  muscle:  { name: 'Toro Muscle', w: 54, h: 26, accel: 330, top: 305, grip: 0.72, hp: 130, colors: ['#f4840b', '#4361ee', '#2a9d8f', '#6d6875'] },
  sedan:   { name: 'Family Sedan', w: 50, h: 24, accel: 235, top: 245, grip: 0.85, hp: 120, colors: ['#adb5bd', '#588157', '#7f5539', '#4a6fa5'] },
  compact: { name: 'Pico Compact', w: 42, h: 21, accel: 250, top: 225, grip: 0.92, hp: 80,  colors: ['#ffd60a', '#70d6ff', '#ff70a6', '#95d5b2'] },
  van:     { name: 'Cargo Van',  w: 56, h: 27, accel: 195, top: 205, grip: 0.80, hp: 190, colors: ['#e9ecef', '#90a955', '#5e503f', '#3d5a80'] },
  pickup:  { name: 'Duna Pickup', w: 54, h: 26, accel: 265, top: 250, grip: 0.78, hp: 170, colors: ['#bc6c25', '#606c38', '#283618', '#9b2226'] },
};
export const MODEL_KEYS = Object.keys(CAR_MODELS);

export const CONTROLS_TEXT = [
  'WASD / Arrows — move & drive',
  'Mouse — aim · Click — punch / shoot',
  'E — enter or steal car · talk · buy · start',
  'Space — handbrake · Shift — sprint',
  'Tab — switch runner (Lucía ⇄ Marco)',
  'T — phone · M — city map · P / Esc — pause',
  'H — horn · 1/2/3 — radio · N — mute',
];
