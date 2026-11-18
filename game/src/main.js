'use strict';
/* Azul Heat — boot and the main loop. Builds the city, seats the
   runners, then runs the simulation: title → select → play, with the
   map / phone / pause overlays freezing the streets while you think. */
(function () {
  const C = AH.CFG, U = AH.U;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const G = AH.G;
  let last = 0, titleAngle = 0;

  function boot() {
    AH.Input.init(canvas);
    AH.World.build();
    AH.Vehicles.spawnParked();
    AH.Traffic.populate();
    AH.Peds.populate();
    AH.Chars.spawnPair();
    if (!AH.Shots.apply()) {
      AH.Save.apply(AH.Save.read());
      AH.Phone.addMessage('Tía Carmen', 'Lucía, mi cielo — come by the bakery when you wake. Work, and pastelitos.');
    }
    G.cam.x = 2020; G.cam.y = 620;
    requestAnimationFrame(frame);
  }

  function startRun(idx) {
    const door = AH.PLACES.carmenBakery;
    G.player = AH.Chars.makeRunner(idx, door.x - 60, door.y + 30);
    G.partner = AH.Chars.makeRunner(1 - idx, door.x + 40, door.y + 46);
    if (!AH.Save.read()) { /* fresh pair at the bakery */ }
    else AH.Save.apply(AH.Save.read());
    G.screen = 'play';
    AH.banner('BAHÍA AZUL', AH.Chars.list[idx].name + ' takes the wheel. TAB swaps runners.', '#ffd23f', 3.4);
  }

  function handlePlayKeys() {
    const In = AH.Input, P = G.player;
    if (G.overlay) {
      if (G.overlay === 'pause') {
        if (In.pressed('KeyS')) { AH.Save.write(); AH.toast('Run saved.'); }
        if (In.pressed('KeyN')) { G.muted = !G.muted; AH.toast(G.muted ? 'Sound off.' : 'Sound on.'); }
        if (In.pressed('KeyX')) { AH.Save.wipe(); location.reload(); return; }
      }
      if (In.pressed('Escape') || (G.overlay === 'phone' && In.pressed('KeyT')) ||
          (G.overlay === 'map' && In.pressed('KeyM')) || (G.overlay === 'pause' && In.pressed('KeyP')))
        G.overlay = null;
      return;
    }
    if (In.pressed('KeyT')) { G.overlay = 'phone'; return; }
    if (In.pressed('KeyM')) { G.overlay = 'map'; return; }
    if (In.pressed('KeyP') || In.pressed('Escape')) { G.overlay = 'pause'; return; }
    if (In.pressed('KeyN')) { G.muted = !G.muted; AH.toast(G.muted ? 'Sound off.' : 'Sound on.'); }
    if (In.pressed('Digit1')) { G.radioStation = 1; if (P.inCar) AH.toast('Radio: Sol FM'); }
    if (In.pressed('Digit2')) { G.radioStation = 2; if (P.inCar) AH.toast('Radio: Prisma Waves'); }
    if (In.pressed('Digit3')) { G.radioStation = 3; if (P.inCar) AH.toast('Radio: Muelle Radio'); }
    if (G.dialogue) return;                     // E belongs to the conversation
    if (In.pressed('KeyE')) AH.Chars.enterExit();
    if (In.pressed('Tab')) AH.Chars.switchRunner();
  }

  function update(dt) {
    G.time += dt;
    if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
    if (G.toast) { G.toast.t += dt; if (G.toast.t > 3.4) G.toast = null; }
    G.shake = Math.max(0, G.shake - dt * 16);
    G.districtTimer = Math.max(0, G.districtTimer - dt * 0.7);

    if (G.screen === 'title') {
      titleAngle += dt * 0.05;
      G.cam.x = 2020 + Math.cos(titleAngle) * 420;
      G.cam.y = 640 + Math.sin(titleAngle * 0.8) * 260;
      AH.Traffic.update(dt); AH.Peds.update(dt);
      if (AH.Input.pressed('Enter') || AH.Input.mouse.clicked) { G.screen = 'select'; AH.Audio.ensure(); AH.Audio.blip(740); }
      if (AH.Input.pressed('KeyN') && AH.Save.read()) { AH.Save.wipe(); AH.toast('Save wiped — fresh run.'); }
      return;
    }
    if (G.screen === 'select') {
      AH.Traffic.update(dt); AH.Peds.update(dt);
      if (AH.Input.pressed('ArrowLeft') || AH.Input.pressed('KeyA')) G.selectIdx = 0;
      if (AH.Input.pressed('ArrowRight') || AH.Input.pressed('KeyD')) G.selectIdx = 1;
      if (AH.Input.pressed('Enter')) startRun(G.selectIdx);
      if (AH.Input.mouse.clicked) {
        const mx = AH.Input.mouse.x;
        startRun(mx < C.viewW / 2 ? 0 : 1);
      }
      return;
    }
    // play
    handlePlayKeys();
    if (!G.overlay) {
      AH.Chars.update(dt);
      AH.Traffic.update(dt);
      AH.Peds.update(dt);
      AH.Police.update(dt);
      AH.Combat.update(dt);
      AH.Story.update(dt);
      AH.Gigs.update(dt);
      // district changes announce themselves
      const P = G.player;
      const dn = AH.DISTRICTS[AH.World.districtAt(P.x, P.y)].name;
      if (dn !== G.districtName) { G.districtName = dn; G.districtTimer = 2.4; }
      // camera: follow, leading a little when driving fast
      const lead = P.inCar ? 0.34 : 0.12;
      const tx = P.x + Math.cos(P.ang) * (P.inCar ? Math.abs(P.inCar.speed) * lead : 0);
      const ty = P.y + Math.sin(P.ang) * (P.inCar ? Math.abs(P.inCar.speed) * lead : 0);
      G.cam.x = U.lerp(G.cam.x, U.clamp(tx, C.viewW / 2, C.worldW - C.viewW / 2), Math.min(1, dt * 5));
      G.cam.y = U.lerp(G.cam.y, U.clamp(ty, C.viewH / 2, C.worldH - C.viewH / 2), Math.min(1, dt * 5));
    }
    AH.Audio.update();
  }

  function frame(ts) {
    const dt = Math.min(0.033, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    update(dt);
    AH.Render.draw(ctx);
    AH.Hud.draw(ctx);
    AH.Input.endFrame();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
