# azul-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Azul Heat: Two Runners** — a top-down open-world crime game set in Bahía Azul, a fictional sunset coastal city of six districts: the Marina with its pier and beach, terracotta Old Town, the neon-lit Strip, green Palm Hills, Midtown, and the container yards of the Docks.

You play **two runners**, switchable at any moment with Tab: **Lucía Ferro**, a courier whose hands make any car handle sweeter, and **Marco Reyes**, an ex-mechanic whose rides shrug off damage. Between them they run a six-mission story for three named contacts — Tía Carmen, El Contador and DJ Prisma — who reach you through an in-game phone: pier pickups, a stolen Comet GT, timed night drops, debt collection, dockside trouble, and a finale that needs both runners working as one.

## What's in the city

- **A living open world** — two-way lane traffic that turns at junctions and brakes for trouble, pedestrians who stroll the sidewalks and flee gunfire, parked cars in every lot, and a golden-hour grade over everything: long shadows, lit windows, glowing neon, lamp pools, a sparkling sea.
- **Cars to steal and drive** — six models (Comet GT, Toro Muscle, sedans, compacts, vans, pickups) with arcade physics, handbrake drift, damage and smoke. Carjack a driver and they bail out running.
- **A five-star wanted system** — witnessed crimes raise your heat; patrol cars hunt and ram, roadblocks wait at three stars, and at four a helicopter pins you in its searchlight. Break line of sight, swap cars, and the heat bleeds away. Get cornered on foot and the bust meter fills.
- **Combat** — fists up close, a pistol at mouse range, hostile crews guarding yards and depots.
- **Side gigs** — checkpoint street races, timed courier runs from the Docks board, and scored rampages.
- **An economy and progression** — cash and per-district reputation from every job, Ammu-Nación shops (armor, ammo, empanadas), and a safehouse where you heal, save the game, and keep one car in the garage. Progress persists in localStorage; Continue picks up where you left off.
- **HUD and phone** — a circular minimap with blips for police, contacts, shops and your objective, wanted stars, a speedometer, district banners, a full city map (M) with reputation and story progress, and a phone (T) carrying every message.
- **Procedural audio** — engine hum, sirens, gunfire and crashes, plus three radio stations of synthesized loops while you drive. No audio files, no assets, no network: everything is drawn and synthesized by the game's own code.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Move & drive |
| Mouse / Click | Aim · punch / shoot |
| E | Enter or steal car · talk · buy · start a gig |
| Space / Shift | Handbrake · sprint |
| Tab | Switch runner (Lucía ⇄ Marco) |
| T / M / P | Phone · city map · pause |
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

`main.ts` is the hand-in program; `vendor/makefun-game.ts` is the kit's dossier library, unchanged. The game lives in `game/`: `index.html` loads `src/main.js`, and each module in `game/src/` has one job — `world.js` builds the city, `traffic.js` and `pedestrians.js` fill it, `vehicles.js` drives, `police.js` hunts, `missions.js` + `story.js` tell the story, `gigs.js` and `economy.js` pay the bills, `render.js` paints the golden hour, `hud.js` and `minimap.js` keep you oriented, `audio.js` synthesizes every sound, and `shots.js` stages the four screenshots in `screenshots/` (real renders of the game, taken through `shots.json`).

<sub>Entered on [make.fun](https://make.fun/?ref=hazel-beacon-85&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
