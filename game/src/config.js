// Azul Heat — config.js: the fixed numbers of Bahía Azul. World size, the road grid,
// district rectangles, car models, colours and the golden-hour palette live here so
// every other module reads the same city.

export const WORLD_W = 3360;
export const WORLD_H = 2520;
export const ROAD_W = 120;
// Centre lines of the vertical and horizontal roads; blocks sit between them.
export const ROADS_X = [420, 980, 1540, 2100, 2660];
export const ROADS_Y = [420, 980, 1540, 2100];
export const BEACH_X = 3060; // sand starts here, sea at WATER_X
export const WATER_X = 3220;

export const DISTRICTS = [
  { id: 'oldtown', name: 'OLD TOWN', x: 0, y: 0, w: 980, h: 1540, ground: '#9c8a70', tint: '#e6d3ac' },
  { id: 'marina', name: 'THE MARINA', x: 2100, y: 0, w: 1260, h: 1540, ground: '#a8b39a', tint: '#dcebf2' },
  { id: 'midtown', name: 'MIDTOWN', x: 980, y: 0, w: 1120, h: 980, ground: '#a3906e', tint: '#e8dcc4' },
  { id: 'strip', name: 'NEON STRIP', x: 980, y: 980, w: 1120, h: 560, ground: '#8d7f95', tint: '#ffd7f2' },
  { id: 'hills', name: 'PALM HILLS', x: 0, y: 1540, w: 1540, h: 980, ground: '#93a06b', tint: '#eef3cf' },
  { id: 'docks', name: 'THE DOCKS', x: 1540, y: 1540, w: 1820, h: 980, ground: '#7e7a72', tint: '#cfd8dc' },
];

// Car models: name, top speed (px/s), acceleration, grip, size, durability.
export const CAR_MODELS = [
  { id: 'compact', name: 'Paloma Compact', speed: 300, accel: 260, grip: 5.2, w: 34, l: 58, hp: 100 },
  { id: 'sedan', name: 'Costa Sedan', speed: 340, accel: 280, grip: 5.4, w: 36, l: 64, hp: 130 },
  { id: 'muscle', name: 'Toro Muscle', speed: 400, accel: 360, grip: 4.4, w: 38, l: 68, hp: 150 },
  { id: 'sport', name: 'Véloce GT', speed: 470, accel: 430, grip: 6.0, w: 36, l: 66, hp: 120 },
  { id: 'van', name: 'Furgón Van', speed: 290, accel: 230, grip: 4.6, w: 40, l: 74, hp: 190 },
  { id: 'taxi', name: 'Azul Taxi', speed: 330, accel: 270, grip: 5.2, w: 36, l: 64, hp: 130 },
];
export const CAR_COLORS = ['#e74c3c', '#f39c12', '#f5f0e6', '#3498db', '#2ecc71', '#9b59b6', '#e91e63', '#95a5a6', '#fd79a8', '#00b894'];
export const POLICE_COLOR = '#eef2f5';

export const PALETTE = {
  road: '#3b3f4a', roadEdge: '#565d6e', lane: '#ffd75e', sidewalk: '#c2ab8c',
  sand: '#eccd85', water1: '#1d7fa8', water2: '#2fa3c7', grass: '#7d9b57',
  shadow: 'rgba(40,16,40,0.28)', sky: '#2a1430',
};

export const CONTROLS_TEXT = [
  'WASD / Arrows — move & drive      Mouse — aim · Click — punch / shoot',
  'E — enter or steal a car, talk, buy, start a gig      Space — handbrake',
  'Shift — sprint      Tab — switch runner (Lucía ⇄ Marco)',
  'T — phone      M — city map      H — horn      1/2/3 — radio      P / Esc — pause',
];
