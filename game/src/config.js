'use strict';
/* Azul Heat — configuration: view, world geometry, districts, palette.
   Everything else reads constants from here so the city stays coherent. */
const AH = window.AH = window.AH || {};

AH.CFG = {
  viewW: 1280, viewH: 800,          // internal canvas resolution
  worldW: 4800, worldH: 3600,       // whole city, in pixels
  roadW: 118,                        // road width (two lanes + parking edges)
  vRoads: [420, 1220, 2020, 2820, 3620],   // vertical road centre lines (x)
  hRoads: [420, 1220, 2020, 2820],         // horizontal road centre lines (y)
  seaX: 4140,                        // sand begins here
  waterX: 4430,                      // deep water begins here (impassable)
  saveKey: 'azulheat-two-runners-v1',
  startCash: 250,
};

/* The six districts of Bahía Azul. Palettes drive building colours,
   ground tint and roof tones so each quarter of the city reads at a glance. */
AH.DISTRICTS = [
  { name: 'Palm Hills', x: 0,    y: 0,    w: 1220, h: 1220,
    ground: '#5d7d43', wall: ['#f2d8b3', '#eec9a0', '#f7e3c3', '#e8b98d'], roof: '#b56a4a', neon: null },
  { name: 'Neon Strip', x: 1220, y: 0,    w: 1600, h: 1220,
    ground: '#4d4457', wall: ['#6a5a8c', '#7d689e', '#59497a', '#8668a8'], roof: '#3c3350', neon: ['#ff4fd8', '#37e0ff', '#ffd23f', '#8dff57'] },
  { name: 'Marina', x: 2820, y: 0,    w: 1320, h: 1220,
    ground: '#5b7d74', wall: ['#dcebe8', '#c4dedd', '#eef3ea', '#b9d4ce'], roof: '#4f8f8a', neon: null },
  { name: 'Old Town', x: 0,    y: 1220, w: 1220, h: 2380,
    ground: '#8a6f4d', wall: ['#d99a5b', '#c9853f', '#e0aa6d', '#b87738'], roof: '#9c4f2e', neon: null },
  { name: 'Midtown', x: 1220, y: 1220, w: 1600, h: 2380,
    ground: '#5c5a63', wall: ['#b9bcc4', '#a5a9b4', '#c9ccd4', '#979ca9'], roof: '#6d7078', neon: null },
  { name: 'The Docks', x: 2820, y: 1220, w: 1320, h: 2380,
    ground: '#5f6157', wall: ['#8f9a94', '#7c8a84', '#a3ada0', '#6f7f78'], roof: '#55604f', neon: null },
];

/* Named places the story and the economy hang on. world.js stamps real
   coordinates into these once the city is generated. */
AH.PLACES = {
  carmenBakery:   { label: "Tía Carmen's Bakery", x: 0, y: 0 },
  contadorOffice: { label: 'Contador & Asociados', x: 0, y: 0 },
  clubPrisma:     { label: 'Club Prisma', x: 0, y: 0 },
  warehouse:      { label: 'Almacén 9 — The Docks', x: 0, y: 0 },
  hospital:       { label: 'Hospital del Sol', x: 0, y: 0 },
  policeStation:  { label: 'Policía de Bahía Azul', x: 0, y: 0 },
  pier:           { label: 'Muelle Azul Pier', x: 0, y: 0 },
};
