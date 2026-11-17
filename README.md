# azul-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bsyrlhabibi/azul-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Azul Heat: Two Runners** — a top-down open-world crime game for the desktop browser,
written in vanilla JavaScript on a single canvas, with no external assets and no network
requests. It plays entirely offline from the files in `game/`.

Welcome to **Bahía Azul**, a fictional sunset coastal city of five named districts — the
Marina, Old Town, the Neon Strip, The Docks and Palm Hills — drawn in a shaded 3/4 view:
gradient buildings that sort back-to-front, two-way traffic, pedestrians on the
sidewalks, palms, a beach and the sea. Two protagonists share the city and you can
switch between them at any moment with Tab: **Lucía Ferro**, a courier whose cars
handle sharper, and **Marco Reyes**, an ex-mechanic who shrugs off damage.

What is in the city:

- **A six-mission story** with named contacts — Tía Carmen, El Contador and DJ Prisma —
  who reach you through the in-game phone: pickups, a car to steal, a DJ to ferry
  between clubs, debts to collect, a port run through roadblocks, and a two-runner
  finale that makes you switch characters mid-mission.
- **A five-star wanted system.** Carjack, assault, shoot or ram your way up the stars;
  patrol cars pursue and ram, roadblocks wait at three stars, and at four a police
  helicopter holds its searchlight on you and stops your heat cooling. Break line of
  sight, swap cars, and the stars fade.
- **Cars to steal and drive** — several models and colours with their own speed and
  handling, damage and smoke, handbrake drifts, horns, and a safehouse garage in Palm
  Hills that stores one car for you.
- **Side gigs that pay**: street-race checkpoint runs, package courier runs and timed
  rampages, plus district reputation, gun-shop ammo and armour, and a save game in
  localStorage (cash, reputation, missions done, garage car) with Continue on the
  title screen.
- **A full HUD**: circular minimap with mission, police and gig blips, wanted stars,
  health and armour, cash, the current objective, a speedometer, a phone with your
  contacts' messages, and a full-city map screen.
- **Procedural WebAudio sound**: engine hum that follows your speed, sirens, gunshots,
  punches, pickups, a mission-complete jingle, and three radio stations of synth loops
  while you drive.

Controls (also shown on the title and pause screens): WASD or arrows move and drive ·
mouse aims, click punches or shoots on foot · E interacts — enter or steal a car, talk,
buy, start a gig · Space handbrake · Shift sprint · Tab switches runner · T opens the
phone · M opens the map · H horn · 1/2/3 radio stations · P or Esc pauses.

## Run it

Hand the entry in (copies `game/` and `screenshots/` to the output directory and
writes `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Then open `game/index.html` in a desktop browser to play. The world is generated from
a fixed seed, so `game/index.html?seed=7` always builds the same Bahía Azul, and
`?shot=chase|marina|mission|map&seed=7` stages the scenes the screenshots were taken
from.

The source is split one job per file under `game/src/`: `world.js` builds the city,
`traffic.js` and `pedestrians.js` keep it alive, `vehicles.js` drives the cars,
`police.js` runs the wanted system and the pursuit, `missions.js` holds the story data
and `story.js` runs it, `combat.js`, `gigs.js` and `economy.js` cover fighting, side
work and money, `phone.js`, `hud.js` and `minimap.js` draw the interface, `audio.js`
synthesises every sound, `render.js` draws the 3/4 city, and `main.js` boots and runs
the loop.

<sub>Entered on [make.fun](https://make.fun/?ref=hazel-beacon-85&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
