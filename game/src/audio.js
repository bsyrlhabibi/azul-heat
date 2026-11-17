// Azul Heat — audio.js: every sound is synthesised with WebAudio, no audio files.
// An engine hum that tracks car speed, a two-tone siren, three radio stations built
// from note patterns, and one-shot effects (gunshot, punch, crash, pickup, jingle).
// The context opens on the first user gesture, as browsers require.

import { G } from './state.js';

let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, sirenLfo = null;
let radioTimer = 0, radioStep = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master); engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 760;
    sirenLfo = ctx.createOscillator(); sirenLfo.frequency.value = 0.55;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 130;
    sirenLfo.connect(lfoGain); lfoGain.connect(sirenOsc.frequency);
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start(); sirenLfo.start();
  } catch { ctx = null; }
}

function env(node, t0, a, peak, d) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.exponentialRampToValueAtTime(peak, t0 + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function blip(freq, dur, type = 'square', vol = 0.16, slide = 0) {
  if (!ctx || G.muted) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, vol, freq = 1200) {
  if (!ctx || G.muted) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

export const sfx = {
  shot() { noise(0.14, 0.5, 2600); blip(160, 0.1, 'square', 0.2, -90); },
  punch() { noise(0.07, 0.3, 700); },
  crash() { noise(0.22, 0.4, 500); },
  pickup() { blip(880, 0.09, 'sine', 0.2); setTimeout(() => blip(1320, 0.12, 'sine', 0.2), 60); },
  cash() { blip(1180, 0.07, 'triangle', 0.22); setTimeout(() => blip(1560, 0.1, 'triangle', 0.22), 55); },
  horn() { blip(370, 0.28, 'square', 0.14); blip(466, 0.28, 'square', 0.1); },
  click() { blip(660, 0.05, 'sine', 0.12); },
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.2), i * 110)); },
  fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.24, 'triangle', 0.18), i * 130)); },
};

// Radio: three stations as looping note patterns (semitone offsets from a root).
const STATIONS = [
  { root: 110, bpm: 112, bass: [0, -1, 0, -1, 3, -1, 0, -1, 5, -1, 3, -1, 0, -1, -2, -1], lead: [12, -1, 15, -1, 19, -1, 15, 12, -1, -1, 10, -1, 12, -1, -1, -1], wave: 'sawtooth' },
  { root: 98, bpm: 96, bass: [0, 0, 7, 0, 5, 5, 12, 7, 0, 0, 7, 0, 3, 5, 7, -1], lead: [12, 15, 19, 15, 17, 15, 12, -1, 10, 12, 15, 12, 19, -1, -1, -1], wave: 'triangle' },
  { root: 87, bpm: 76, bass: [0, -1, -1, 7, -1, -1, 5, -1, 0, -1, -1, 7, -1, 8, 7, -1], lead: [24, -1, 22, -1, 19, -1, -1, -1, 17, -1, 19, -1, 22, -1, -1, -1], wave: 'sine' },
];
const semi = (root, s) => root * Math.pow(2, s / 12);

export function updateAudio(dt, engineFrac, driving, sirenOn) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (engineGain) {
    const target = G.muted || !driving ? 0 : 0.05 + engineFrac * 0.08;
    engineGain.gain.setTargetAtTime(target, t, 0.08);
    engineOsc.frequency.setTargetAtTime(52 + engineFrac * 130, t, 0.08);
  }
  if (sirenGain) sirenGain.gain.setTargetAtTime(G.muted || !sirenOn ? 0 : 0.028, t, 0.2);
  if (G.muted || !driving || G.radio === 0) return;
  const st = STATIONS[G.radio - 1];
  radioTimer -= dt;
  if (radioTimer <= 0) {
    radioTimer = 30 / st.bpm;
    const i = radioStep % 16; radioStep++;
    if (st.bass[i] >= 0) blip(semi(st.root, st.bass[i]), 0.16, 'square', 0.10);
    if (st.lead[i] >= 0) blip(semi(st.root, st.lead[i]), 0.14, st.wave, 0.055);
  }
}
