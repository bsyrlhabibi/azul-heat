# azul-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Azul Heat: Two Runners** — a top-down open-world crime game set in Bahía Azul, a fictional sunset coastal city of six districts: the Marina with its pier and beach, terracotta Old Town, the neon-lit Strip, pastel Palm Hills, Midtown, and the container yards of the Docks.

You play **two runners**, switchable at any moment with Tab: **Lucía Ferro**, a courier whose hands make any car handle sweeter, and **Marco Reyes**, an ex-mechanic whose rides shrug off damage. Between them they run a six-mission story for three named contacts — Tía Carmen, El Contador and DJ Prisma — who reach you through an in-game phone.

## What's in the city

- **A living open world** — two-way lane traffic, pedestrians on the sidewalks, parked cars in every lot, and a golden-hour grade over everything: long shadows, lit windows, glowing neon with light pools, lamp pools, a sparkling animated sea, a pier, dock cranes and shipping containers.
- **Cars to steal and drive** — enter or steal any car with E; arcade driving with handbrake, damage and smoke.
- **A five-star wanted system** — patrol cars and foot cops pursue, roadblocks wait at three stars, and at four a helicopter pins you in its searchlight. Break line of sight, hide or swap cars, and the heat bleeds away.
- **Combat and consequences** — mouse-aim shooting, health and armor, wasted means a hospital respawn with a fee, and a bust meter when the police corner you on foot.
- **Side gigs and progression** — checkpoint street races and timed courier runs pay cash; buy safehouses that become your save and garage points, and earn reputation in every district. Progress persists in localStorage.
- **HUD and phone** — a circular minimap with blips for police, objectives and safehouses, wanted stars, a speedometer, district banners, a full city map (M) with reputation and story progress, and a phone (T) carrying every message.
- **Procedural audio** — engine hum, sirens, gunfire and crashes, plus three radio stations of synthesized loops while you drive. No audio files, no assets, no network: everything is drawn and synthesized by the game's own code.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Move & drive |
| Mouse / Click | Aim · shoot |
| E | Enter or steal car · interact |
| Space / Shift | Handbrake · sprint |
| Tab | Switch runner (Lucía ⇄ Marco) |
| T / M / P or Esc | Phone · city map · pause |
| H · 1/2/3 · N | Horn · radio stations · mute |

## Run it

The game is plain static files — serve the folder and open it in a desktop browser:

```sh
cd game && python3 -m http.server 8080   # or any static server
# open http://localhost:8080
```

To produce the judged hand-in (copies `game/` and `screenshots/` and writes `dossier.json`), run the entrypoint with Node 22:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

`main.ts` is the hand-in program; `vendor/makefun-game.ts` is the kit's dossier library, unchanged. The game lives in `game/`: `index.html` loads the modules in `game/src/`, each with one job — `world.js` builds the city, `traffic.js` and `pedestrians.js` fill it, `vehicles.js` drives, `police.js` hunts, `characters.js` defines the two runners, `missions.js` + `story.js` tell the story, `gigs.js` and `economy.js` pay the bills, `combat.js` fights, `phone.js` talks, `render.js` paints the golden hour, `hud.js` and `minimap.js` keep you oriented, `audio.js` synthesizes every sound, `save.js` persists progress, and `shots.js` stages the four screenshots in `screenshots/` (real renders of the game, taken through `shots.json`).

<sub>Entered on [make.fun](https://make.fun/?ref=hazel-beacon-85&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
