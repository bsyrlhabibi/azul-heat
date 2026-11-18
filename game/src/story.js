'use strict';
/* Azul Heat — the story runner. Offers the next mission at its giver,
   walks the stage list (talk / goto / drive / escape / switch / timed),
   pays out, and keeps the HUD objective honest. */
AH.Story = (function () {
  const U = AH.U;

  function targetOf(at) {
    if (!at) return null;
    if (typeof at === 'string') return AH.PLACES[at];
    return at;
  }

  function currentDef() {
    const G = AH.G;
    return G.storyDone < AH.MISSIONS.length ? AH.MISSIONS[G.storyDone] : null;
  }

  function tryInteract(x, y) {
    const G = AH.G;
    if (G.mission || G.dialogue) return false;
    const def = currentDef();
    if (!def) return false;
    const gp = AH.PLACES[def.giver];
    if (U.dist(x, y, gp.x, gp.y) > 64) return false;
    startMission(def);
    return true;
  }

  function startMission(def) {
    const G = AH.G;
    G.mission = { def, stage: 0, t: 0, switched: false, failOnBust: !!def.failOnBust };
    for (const m of def.intro) AH.Phone.addMessage(def.from, m);
    AH.banner('MISSION — ' + def.title.toUpperCase(), 'From ' + def.from + ' · $' + def.reward, '#ffd23f', 3.4);
    AH.Audio.blip(740);
    beginStage();
  }

  function beginStage() {
    const G = AH.G, st = G.mission.def.stages[G.mission.stage];
    G.mission.t = st.t === 'timed' ? st.secs : 0;
    if (st.heat) { AH.Police.setWanted(st.heat); G.wantedFloor = st.t === 'escape' ? 0 : st.heat; }
    if (st.t === 'drive' && st.heat) G.wantedFloor = st.heat;
  }

  function advance() {
    const G = AH.G;
    G.mission.stage++;
    G.wantedFloor = 0;
    if (G.mission.stage >= G.mission.def.stages.length) completeMission();
    else beginStage();
  }

  function completeMission() {
    const G = AH.G, def = G.mission.def, P = G.player;
    G.mission = null;
    G.storyDone++;
    AH.Economy.addCash(def.reward, P.x, P.y);
    AH.Economy.addRep(P.x, P.y, 12);
    for (const m of def.outro) AH.Phone.addMessage(def.from, m);
    AH.banner('MISSION COMPLETE', def.title + ' — $' + def.reward, '#8dff57', 3.8);
    AH.Audio.fanfare();
    AH.Save.write();
  }

  function failMission(reason) {
    const G = AH.G;
    if (!G.mission) return;
    AH.banner('MISSION FAILED', reason, '#ff5964', 3.4);
    G.mission = null; G.wantedFloor = 0;
    AH.Audio.blip(160);
  }

  function startDialogue(lines) {
    AH.G.dialogue = { lines, i: 0, t: 0 };
    AH.Audio.blip(880);
  }

  function updateDialogue(dt) {
    const G = AH.G;
    if (!G.dialogue) return;
    G.dialogue.t += dt;
    if (AH.Input.pressed('KeyE') || AH.Input.mouse.clicked || G.dialogue.t > 4.2) {
      G.dialogue.i++; G.dialogue.t = 0;
      AH.Audio.blip(700);
      if (G.dialogue.i >= G.dialogue.lines.length) {
        G.dialogue = null;
        if (G.mission && G.mission.def.stages[G.mission.stage].t === 'talk') advance();
      }
    }
  }

  function objective() {
    const G = AH.G;
    if (G.gig) return AH.Gigs.objective();
    if (!G.mission) {
      const def = currentDef();
      if (!def) return null;
      const gp = AH.PLACES[def.giver];
      return { x: gp.x, y: gp.y, label: 'Meet ' + def.from + ' — ' + def.title + ' (E)', giver: true };
    }
    const st = G.mission.def.stages[G.mission.stage];
    const tp = targetOf(st.at);
    switch (st.t) {
      case 'talk': return { x: tp.x, y: tp.y, label: 'Talk to ' + st.who };
      case 'goto': return { x: tp.x, y: tp.y, label: st.label };
      case 'drive': return { x: tp.x, y: tp.y, label: st.label };
      case 'timed': return { x: tp.x, y: tp.y, label: st.label + ' — ' + Math.ceil(G.mission.t) + 's' };
      case 'escape': return { x: G.player.x, y: G.player.y, label: st.label + ' — stay unseen' };
      case 'switch': return { x: G.partner.x, y: G.partner.y, label: st.label };
    }
    return null;
  }

  function update(dt) {
    const G = AH.G, P = G.player;
    updateDialogue(dt);
    if (!G.mission || G.dialogue) return;
    const st = G.mission.def.stages[G.mission.stage];
    const tp = targetOf(st.at);
    switch (st.t) {
      case 'talk':
        if (U.dist(P.x, P.y, tp.x, tp.y) < 78 && !P.inCar) startDialogue(st.lines);
        break;
      case 'goto':
        if (U.dist(P.x, P.y, tp.x, tp.y) < 56) advance();
        break;
      case 'drive':
        if (P.inCar && U.dist(P.x, P.y, tp.x, tp.y) < 84) advance();
        break;
      case 'timed':
        G.mission.t -= dt;
        if (P.inCar && U.dist(P.x, P.y, tp.x, tp.y) < 84) advance();
        else if (G.mission.t <= 0) failMission('Out of time.');
        break;
      case 'escape':
        if (G.wanted === 0) advance();
        break;
      case 'switch':
        if (G.mission.switched) advance();
        break;
    }
  }

  function prompt() {
    const G = AH.G;
    if (G.mission || G.dialogue) return null;
    const def = currentDef();
    if (!def) return null;
    const gp = AH.PLACES[def.giver], P = G.player;
    if (P && U.dist(P.x, P.y, gp.x, gp.y) < 64) return 'E — Start mission: ' + def.title;
    return null;
  }

  return { tryInteract, update, objective, prompt, failMission, currentDef, targetOf };
})();
