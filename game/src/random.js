// Azul Heat — random.js: a seeded mulberry32 generator. The whole city is built from
// one seed, so ?seed=7 always raises the same Bahía Azul and staged screenshots are
// reproducible frame for frame.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

/** The seed from the URL (?seed=), defaulting to 7. */
export function urlSeed() {
  const n = Number(new URLSearchParams(location.search).get('seed'));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
}

/** The staged scene name from ?shot=, or null for a normal game. */
export function urlShot() {
  return new URLSearchParams(location.search).get('shot');
}
