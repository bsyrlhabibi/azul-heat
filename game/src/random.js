'use strict';
/* Azul Heat — seeded randomness and small math helpers.
   The city is generated from a fixed seed so every visit (and every
   screenshot) shows the same Bahía Azul. */
AH.Rng = (function () {
  let s = 7 >>> 0;
  function seed(n) { s = (n >>> 0) || 1; }
  function next() {           // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(a, b) { return a + next() * (b - a); }
  function int(a, b) { return Math.floor(range(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(next() * arr.length)]; }
  function chance(p) { return next() < p; }
  return { seed, next, range, int, pick, chance };
})();

AH.U = {
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
  dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
  angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  angLerp(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  },
  angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
};
