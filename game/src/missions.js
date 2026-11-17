// missions.js — the six-mission story of Azul Heat, as data. Each mission
// is a chain of steps the runner in story.js interprets: goto, pickup,
// timed, steal, deliver, fight, switch and escape.

import { PLACES } from './config.js';

export const MISSIONS = [
  {
    id: 'lucia1', who: 'lucia', contact: 'carmen', title: 'First Run', payout: 400, district: 'The Marina',
    briefing: [
      'Tía Carmen: "Mija, a package waits at the end of the pier — the yacht people left it for me."',
      '"Fetch it on foot, then run it across town to El Contador in Old Town. Fast, but bring it whole."',
    ],
    steps: [
      { t: 'pickup', x: PLACES.pierEnd.x, y: PLACES.pierEnd.y, r: 34, label: 'Pick up the package at the pier' },
      { t: 'timed', x: PLACES.contador.x, y: PLACES.contador.y, r: 46, seconds: 200, label: 'Deliver the package to El Contador' },
    ],
  },
  {
    id: 'lucia2', who: 'lucia', contact: 'contador', title: 'Hot Wheels', payout: 650, district: 'Neon Strip',
    briefing: [
      'El Contador: "A yellow Comet GT sits in the Casino Perla lot, Lucía. It was never really theirs."',
      '"Take it to the Docks depot. If the police notice, lose them before you arrive."',
    ],
    steps: [
      { t: 'steal', carModel: 'comet', carColor: '#ffd60a', carAt: { x: 2500, y: 360, angle: 0 }, label: 'Steal the yellow Comet GT at Casino Perla' },
      { t: 'deliver', x: PLACES.docksDepot.x, y: PLACES.docksDepot.y, r: 60, label: 'Deliver the Comet to the Docks depot' },
      { t: 'escape', heat: 2, label: 'Lose the police' },
    ],
  },
  {
    id: 'lucia3', who: 'lucia', contact: 'prisma', title: 'Night Courier', payout: 800, district: 'Neon Strip',
    briefing: [
      'DJ Prisma: "Three drops before my set ends, hermosa: the south Strip, Midtown, then Tía Carmen."',
      '"Each one is timed. The city is your dancefloor — do not stop moving."',
    ],
    steps: [
      { t: 'timed', x: 2670, y: 1150, r: 52, seconds: 80, label: 'Drop 1: the south Strip junction' },
      { t: 'timed', x: 1620, y: 1725, r: 52, seconds: 85, label: 'Drop 2: the Midtown crossing' },
      { t: 'timed', x: PLACES.carmen.x, y: PLACES.carmen.y, r: 48, seconds: 95, label: 'Drop 3: Tía Carmen at the Marina' },
    ],
  },
  {
    id: 'marco1', who: 'marco', contact: 'contador', title: 'Wrench Work', payout: 550, district: 'Old Town',
    briefing: [
      'El Contador: "Marco. Some locos at the Old Town yard owe me money and respect."',
      '"Collect both. Then bring the case home to the safehouse."',
    ],
    steps: [
      { t: 'goto', x: PLACES.oldtownYard.x, y: PLACES.oldtownYard.y, r: 60, label: 'Go to the Old Town yard' },
      { t: 'fight', x: PLACES.oldtownYard.x, y: PLACES.oldtownYard.y, count: 3, label: 'Collect the debt: put the locos down' },
      { t: 'goto', x: PLACES.safehouse.x, y: PLACES.safehouse.y, r: 56, label: 'Bring the case to the safehouse' },
    ],
  },
  {
    id: 'marco2', who: 'marco', contact: 'carmen', title: 'Dockside Heat', payout: 750, district: 'The Docks',
    briefing: [
      'Tía Carmen: "The Docks crew used my name like a joke, Marco. Go remind them it is not funny."',
      '"Handle their guards at the depot — then disappear before the whole port wakes up."',
    ],
    steps: [
      { t: 'goto', x: PLACES.docksDepot.x, y: PLACES.docksDepot.y, r: 64, label: 'Head to the Docks depot' },
      { t: 'fight', x: PLACES.docksDepot.x, y: PLACES.docksDepot.y, count: 4, label: 'Put the depot guards down' },
      { t: 'escape', heat: 3, label: 'Vanish: lose the police' },
    ],
  },
  {
    id: 'finale', who: 'both', contact: 'carmen', title: 'Two Runners', payout: 1500, district: 'The Marina', requires: 3,
    briefing: [
      'Tía Carmen: "Tonight we move everything. One of you takes the yacht package at the Marina."',
      '"Then the other drives it out of the Docks while the whole city watches. Together, como familia."',
    ],
    steps: [
      { t: 'pickup', x: PLACES.pierEnd.x, y: PLACES.pierEnd.y, r: 34, label: 'Take the yacht package at the pier' },
      { t: 'switch', label: 'Switch runner (Tab) — the other brings the wheels' },
      { t: 'timed', x: PLACES.docksDepot.x, y: PLACES.docksDepot.y, r: 62, seconds: 170, label: 'Drive the package out through the Docks depot' },
      { t: 'escape', heat: 3, label: 'Lose the police — both of you' },
    ],
  },
];

export function missionById(id) { return MISSIONS.find((m) => m.id === id); }
