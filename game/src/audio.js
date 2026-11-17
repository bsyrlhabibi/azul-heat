// audio.js — all sound is synthesized with WebAudio: engine hum, police
// siren, three looped radio stations and one-shot effects. No audio files.

import { G } from './state.js';

let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
let radioTimer = 0, radioStep = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(ef); ef.connect(engineGain); engineGain.connect(master); engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  } catch { ctx = null; }
}

function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  if (!ctx || G.muted) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq = 1200) {
  if (!ctx || G.muted) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export const sfx = {
  shot() { noise(0.12, 0.5, 2600); tone(160, 0.1, 'square', 0.2, 0, 60); },
  punch() { tone(110, 0.09, 'sine', 0.5, 0, 45); },
  crash(hard = 1) { noise(0.25 * hard, 0.5, 700); tone(70, 0.2, 'sine', 0.4, 0, 35); },
  pickup() { tone(660, 0.08, 'sine', 0.3); tone(990, 0.12, 'sine', 0.3, 0.07); },
  cash() { tone(1320, 0.07, 'square', 0.16); tone(1760, 0.12, 'square', 0.16, 0.06); },
  click() { tone(880, 0.05, 'sine', 0.2); },
  horn() { tone(370, 0.22, 'square', 0.22); tone(466, 0.22, 'square', 0.18); },
  complete() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.3, i * 0.1)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.18, 'triangle', 0.28, i * 0.11)); },
  message() { tone(1175, 0.07, 'sine', 0.22); tone(1568, 0.1, 'sine', 0.22, 0.08); },
};

// Radio: tiny step-sequenced loops, one per station.
const STATIONS = [
  null,
  { bpm: 116, bass: [110, 0, 110, 0, 131, 0, 98, 0], lead: [440, 554, 659, 554, 440, 0, 392, 440], wave: 'triangle' },
  { bpm: 100, bass: [87, 0, 87, 87, 0, 104, 0, 98], lead: [349, 0, 415, 0, 466, 415, 349, 0], wave: 'sawtooth' },
  { bpm: 126, bass: [98, 98, 0, 117, 0, 98, 147, 0], lead: [587, 0, 523, 587, 698, 0, 587, 523], wave: 'square' },
];
export const STATION_NAMES = ['', 'Solana FM', 'Neon Nights', 'Radio Bahía'];

export function updateAudio(dt, speedRatio, policeNear) {
  if (!ctx) return;
  const t = ctx.currentTime;
  engineGain.gain.setTargetAtTime(G.muted ? 0 : (speedRatio > 0.01 ? 0.05 + speedRatio * 0.05 : 0), t, 0.1);
  engineOsc.frequency.setTargetAtTime(55 + speedRatio * 165, t, 0.08);
  if (policeNear > 0 && !G.muted) {
    sirenGain.gain.setTargetAtTime(0.028 * policeNear, t, 0.2);
    sirenOsc.frequency.setTargetAtTime(720 + Math.sin(G.time * 5.2) * 190, t, 0.05);
  } else sirenGain.gain.setTargetAtTime(0, t, 0.15);
  // Radio sequencer, only while driving with a station on.
  const st = STATIONS[G.radio];
  if (st && G.runners[G.active].car && !G.muted) {
    radioTimer -= dt;
    if (radioTimer <= 0) {
      radioTimer = 30 / st.bpm;
      const i = radioStep % 8; radioStep++;
      if (st.bass[i]) tone(st.bass[i], 0.22, 'sine', 0.30);
      if (st.lead[i]) tone(st.lead[i], 0.16, st.wave, 0.10);
    }
  }
}
