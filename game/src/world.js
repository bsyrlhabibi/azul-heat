'use strict';
/* Azul Heat — the city of Bahía Azul: generation, districts, landmarks,
   props, ground classification and building collision. Generated once
   from the fixed seed so the city is identical on every load. */
AH.World = (function () {
  const C = AH.CFG, R = AH.Rng, U = AH.U;
  let buildings = [], props = [], lamps = [], blocks = [];

  /* Landmark footprints: [placeKey or safehouseKey, x, y, w, d, h, sign] */
  const LANDMARKS = [
    ['carmenBakery',   2950, 520, 170, 120, 52, "CARMEN'S"],
    ['marinaRoom',     3250, 520, 150, 110, 44, 'AZUL ROOMS'],
    ['clubPrisma',     1450, 540, 220, 150, 96, 'CLUB PRISMA'],
    ['contadorOffice', 1650, 1450, 180, 130, 88, 'CONTADOR & ASOC.'],
    ['hospital',       2250, 2250, 260, 170, 74, 'HOSPITAL DEL SOL'],
    ['policeStation',  1400, 2250, 220, 150, 66, 'POLICÍA'],
    ['warehouse',      3000, 3000, 340, 210, 40, 'ALMACÉN 9'],
    ['oldTownFlat',    520, 1450, 150, 110, 58, ''],
    ['stripSuite',     2350, 480, 170, 130, 130, 'HOTEL SOL'],
    ['palmVilla',      180, 200, 170, 130, 34, ''],
  ];

  function districtAt(x, y) {
    for (let i = 0; i < AH.DISTRICTS.length; i++) {
      const d = AH.DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return i;
    }
    return 4; // the sea counts as Midtown for reputation purposes
  }

  function isRoad(x, y) {
    for (const rx of C.vRoads) if (Math.abs(x - rx) < C.roadW / 2) return true;
    for (const ry of C.hRoads) if (Math.abs(y - ry) < C.roadW / 2) return true;
    return false;
  }

  function groundAt(x, y) {
    if (x >= C.waterX) return 'water';
    if (x >= C.seaX) return 'sand';
    if (isRoad(x, y)) return 'road';
    return 'land';
  }

  function blockSpans() {
    const xs = [0], ys = [0];
    for (const rx of C.vRoads) { xs.push(rx - C.roadW / 2, rx + C.roadW / 2); }
    xs.push(C.seaX);
    for (const ry of C.hRoads) { ys.push(ry - C.roadW / 2, ry + C.roadW / 2); }
    ys.push(C.worldH);
    const bx = [], by = [];
    for (let i = 0; i < xs.length; i += 2) bx.push([xs[i], xs[i + 1]]);
    for (let i = 0; i < ys.length; i += 2) by.push([ys[i], ys[i + 1]]);
    return { bx, by };
  }

  function hitsLandmark(x, y, w, d) {
    for (const L of LANDMARKS) {
      if (x < L[1] + L[3] + 34 && x + w > L[1] - 34 && y < L[2] + L[4] + 46 && y + d > L[2] - 20) return true;
    }
    return false;
  }

  function addBuilding(x, y, w, d, h, di, kind, sign) {
    const dist = AH.DISTRICTS[di];
    buildings.push({
      x, y, w, d, h, di, kind: kind || 'block',
      wall: R.pick(dist.wall), roof: dist.roof,
      seed: R.int(1, 99999), sign: sign || '',
      winLit: R.range(0.35, 0.8),
    });
  }

  function fillBlock(x0, y0, x1, y1) {
    const di = districtAt((x0 + x1) / 2, (y0 + y1) / 2);
    const dist = AH.DISTRICTS[di];
    const roll = R.next();
    const kind = (dist.name === 'The Docks' && roll < 0.45) ? 'containers' : roll < 0.10 ? 'park' : roll < 0.20 ? 'parking' : 'buildings';
    blocks.push({ x0, y0, x1, y1, kind });
    if (dist.name === 'The Docks' && roll < 0.45) {          // container yard
      for (let i = 0; i < 7; i++) {
        const w = R.range(110, 150), d = R.range(44, 56);
        const x = R.range(x0 + 16, x1 - w - 16), y = R.range(y0 + 16, y1 - d - 16);
        if (!hitsLandmark(x, y, w, d)) addBuilding(x, y, w, d, R.range(16, 30), di, 'container');
      }
      return;
    }
    if (roll < 0.10) {                                        // park
      for (let i = 0; i < 12; i++)
        props.push({ kind: R.chance(0.5) ? 'palm' : 'tree', x: R.range(x0 + 30, x1 - 30), y: R.range(y0 + 30, y1 - 30), seed: R.int(1, 9999) });
      return;
    }
    if (roll < 0.20) return;                                  // parking lot / plaza
    let y = y0 + 24;
    while (y < y1 - 90) {
      let x = x0 + 24;
      const dh = dist.name === 'Neon Strip' ? R.range(110, 210) : dist.name === 'Midtown' ? R.range(70, 150)
        : dist.name === 'The Docks' ? R.range(26, 44) : dist.name === 'Palm Hills' ? R.range(20, 38) : R.range(36, 84);
      const d = R.range(78, 132);
      while (x < x1 - 90) {
        const w = dist.name === 'The Docks' ? R.range(180, 300) : R.range(88, 180);
        if (x + w <= x1 - 16 && y + d <= y1 - 14 && !hitsLandmark(x, y, w, d))
          addBuilding(x, y, w, d, dh * R.range(0.8, 1.2), di);
        x += w + R.range(16, 34);
      }
      y += d + R.range(18, 36);
    }
  }

  function build() {
    R.seed(7);
    buildings = []; props = []; lamps = []; blocks = [];
    const { bx, by } = blockSpans();
    for (const [x0, x1] of bx) for (const [y0, y1] of by) {
      if (x1 - x0 < 120 || y1 - y0 < 120) continue;
      fillBlock(x0, y0, x1, y1);
    }
    for (const L of LANDMARKS) {
      const di = districtAt(L[1] + L[3] / 2, L[2] + L[4] / 2);
      addBuilding(L[1], L[2], L[3], L[4], L[5], di, 'landmark', L[6]);
      if (AH.PLACES[L[0]]) { AH.PLACES[L[0]].x = L[1] + L[3] / 2; AH.PLACES[L[0]].y = L[2] + L[4] + 22; }
      else AH.SAFEHOUSE_SPOTS[L[0]] = { x: L[1] + L[3] / 2, y: L[2] + L[4] + 22 };
    }
    // street lamps along every road
    for (const rx of C.vRoads) for (let y = 90; y < C.worldH; y += 290) {
      lamps.push({ x: rx - C.roadW / 2 - 9, y }); lamps.push({ x: rx + C.roadW / 2 + 9, y: y + 145 });
    }
    for (const ry of C.hRoads) for (let x = 160; x < C.seaX; x += 310) lamps.push({ x, y: ry - C.roadW / 2 - 9 });
    // beach life: palms, umbrellas, the pier
    for (let i = 0; i < 26; i++) props.push({ kind: 'palm', x: R.range(C.seaX + 20, C.waterX - 30), y: R.range(40, C.worldH - 40), seed: R.int(1, 9999) });
    const umbCols = ['#ff5964', '#ffd23f', '#37e0ff', '#ff9f1c', '#8dff57'];
    for (let y = 200; y < C.worldH - 120; y += 210)
      props.push({ kind: 'umbrella', x: R.range(C.seaX + 70, C.waterX - 90), y: y + R.range(-30, 30), color: R.pick(umbCols), seed: R.int(1, 9999) });
    props.push({ kind: 'pier', x: C.waterX - 10, y: 470 });
    props.push({ kind: 'crane', x: 3560, y: 1330, seed: 5 });
    props.push({ kind: 'crane', x: 3980, y: 2960, seed: 9 });
    AH.PLACES.pier.x = C.waterX - 30; AH.PLACES.pier.y = 515;
  }

  /* Push a circle out of every building footprint it overlaps. */
  function collide(x, y, r) {
    let hit = false;
    for (const b of buildings) {
      if (x > b.x - r - 4 && x < b.x + b.w + r + 4 && y > b.y - r - 4 && y < b.y + b.d + r + 4) {
        const dxl = x - (b.x - r), dxr = (b.x + b.w + r) - x;
        const dyt = y - (b.y - r), dyb = (b.y + b.d + r) - y;
        const m = Math.min(dxl, dxr, dyt, dyb);
        if (m === dxl) x = b.x - r; else if (m === dxr) x = b.x + b.w + r;
        else if (m === dyt) y = b.y - r; else y = b.y + b.d + r;
        hit = true;
      }
    }
    x = U.clamp(x, r, C.worldW - r);
    y = U.clamp(y, r, C.worldH - r);
    return { x, y, hit };
  }

  function randomRoadPoint() {
    if (R.chance(0.55)) return { x: R.pick(C.vRoads) + R.range(-26, 26), y: R.range(60, C.worldH - 60) };
    return { x: R.range(60, C.seaX - 40), y: R.pick(C.hRoads) + R.range(-26, 26) };
  }

  return { build, districtAt, isRoad, groundAt, collide, randomRoadPoint,
           get buildings() { return buildings; }, get props() { return props; }, get lamps() { return lamps; }, get blocks() { return blocks; } };
})();

/* Buyable safehouse door positions; world.js stamps coordinates in. */
AH.SAFEHOUSE_SPOTS = { marinaRoom: { x: 0, y: 0 }, oldTownFlat: { x: 0, y: 0 }, stripSuite: { x: 0, y: 0 }, palmVilla: { x: 0, y: 0 } };
