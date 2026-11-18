'use strict';
/* Azul Heat — procedural WebAudio. No audio files exist: the engine,
   the sirens, the gunshots and all three radio stations are synthesised
   live. The context wakes on the first user gesture, per browser rules. */
AH.Audio = (function () {
  let ctx = null, master = null, engineOsc = null, engineGain = null, radioTimer = null, radioStep = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
      const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 320;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(ef); ef.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      radioTimer = setInterval(radioTick, 214);
      return true;
    } catch (e) { return false; }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || AH.G.muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, freq) {
    if (!ctx || AH.G.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }

  /* Three stations: 1 = Sol FM (warm chords), 2 = Prisma Waves (arp),
     3 = Muelle Radio (bass groove). Notes are picked per step. */
  const STATIONS = [
    { scale: [261.6, 329.6, 392, 493.9], type: 'triangle', vol: 0.10 },
    { scale: [220, 261.6, 329.6, 440, 523.3], type: 'square', vol: 0.045 },
    { scale: [110, 130.8, 146.8, 164.8], type: 'sawtooth', vol: 0.09 },
  ];
  function radioTick() {
    const G = AH.G;
    if (!ctx || G.muted || !G.player || !G.player.inCar || G.screen !== 'play') return;
    const st = STATIONS[(G.radioStation - 1) % 3];
    radioStep++;
    const n = st.scale[Math.floor(Math.abs(Math.sin(radioStep * 1.7)) * st.scale.length) % st.scale.length];
    tone(n, 0.21, st.type, st.vol, null);
    if (radioStep % 4 === 0) tone(st.scale[0] / 2, 0.3, 'sine', 0.08, null);
  }

  function update() {
    if (!ctx) return;
    const G = AH.G, P = G.player;
    const inCar = P && P.inCar && G.screen === 'play' && !G.muted;
    const target = inCar ? 0.05 + Math.abs(P.inCar.speed) / 385 * 0.075 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    if (inCar) engineOsc.frequency.setTargetAtTime(52 + Math.abs(P.inCar.speed) * 0.55, ctx.currentTime, 0.06);
    // sirens: any cop car close and hot
    if (G.wanted > 0 && !G.muted) {
      for (const c of G.cars) if (c.mode === 'police' && AH.U.dist2(c.x, c.y, P.x, P.y) < 520 * 520) {
        if (!update.sirenT || G.time - update.sirenT > 0.92) { update.sirenT = G.time; tone(660, 0.42, 'sine', 0.028, 920); }
        break;
      }
    }
  }

  return {
    ensure, update,
    blip(f) { tone(f || 700, 0.09, 'sine', 0.10); },
    cash() { tone(990, 0.08, 'square', 0.06); setTimeout(() => tone(1320, 0.12, 'square', 0.06), 55); },
    shot() { noise(0.11, 0.22, 1400); },
    crash(v) { if (v > 2) noise(0.16, Math.min(0.3, 0.08 + v * 0.02), 300); },
    thud() { noise(0.2, 0.25, 180); },
    boom() { noise(0.7, 0.4, 120); tone(70, 0.6, 'sine', 0.3, 34); },
    honk() { tone(370, 0.16, 'square', 0.05); },
    door() { noise(0.07, 0.12, 500); },
    engineStart() { tone(60, 0.4, 'sawtooth', 0.12, 130); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 95)); },
  };
})();
