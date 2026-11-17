// Azul Heat — missions.js: the story, as data. Six missions for the two runners,
// three contacts who hand them out from their plazas, and every step written as a
// small record (goto, timed, steal, fight, escape, switch) that story.js runs.
// Nothing here is code: names, places, payouts and phone lines only.

export const CONTACTS = {
  carmen: { id: 'carmen', name: 'Tía Carmen', x: 2380, y: 700, shirt: '#c0392b' },
  contador: { id: 'contador', name: 'El Contador', x: 700, y: 700, shirt: '#2c3e50' },
  prisma: { id: 'prisma', name: 'DJ Prisma', x: 1820, y: 1260, shirt: '#8e44ad' },
};

// Step fields: type, x, y, label, and optionally time (seconds), fight (thugs to
// beat on arrival), heat (stars to raise when the step starts), model/color for a
// car the step spawns. r is the arrival radius.
export const MISSIONS = [
  {
    id: 'lucia_first', runner: 'lucia', contact: 'carmen', title: 'First Run',
    intro: ['Tía Carmen: Lucía, mi amor. A crate of my rum came in at the Marina sheds.', 'Take it to the café on Plaza Vieja before it grows legs. And drive like you mean it.'],
    payout: 400,
    steps: [
      { type: 'goto', x: 2620, y: 560, r: 52, label: 'Pick up the crate at the Marina sheds' },
      { type: 'goto', x: 700, y: 880, r: 52, label: 'Deliver the crate to Café Vieja', time: 150 },
    ],
  },
  {
    id: 'lucia_wheels', runner: 'lucia', contact: 'carmen', title: 'Hot Wheels',
    intro: ['Tía Carmen: A Véloce GT sits in Palm Hills, bought with money that was not theirs.', 'Take it. Bring it to my cousin at the Docks. If the police notice — that is your problem, querida.'],
    payout: 650,
    steps: [
      { type: 'steal', x: 760, y: 2100, r: 60, label: 'Steal the Véloce GT in Palm Hills', model: 'sport', color: '#e91e63' },
      { type: 'goto', x: 2450, y: 2100, r: 64, label: 'Deliver the GT to the Docks', heat: 0 },
    ],
  },
  {
    id: 'lucia_neon', runner: 'lucia', contact: 'prisma', title: 'Neon Debt',
    intro: ['DJ Prisma: Three clubs owe me a night each, and tonight I collect.', 'Drive me club to club, fast. The last owner is a sore loser — expect sirens.'],
    payout: 800,
    steps: [
      { type: 'goto', x: 1820, y: 1260, r: 52, label: 'Pick up DJ Prisma at Club Prisma' },
      { type: 'goto', x: 1120, y: 980, r: 58, label: 'Club one: Cine Ola', time: 75 },
      { type: 'goto', x: 2380, y: 980, r: 58, label: 'Club two: Casino Perla', time: 75 },
      { type: 'goto', x: 1820, y: 1400, r: 58, label: 'Club three: back to Prisma', time: 75, heat: 2 },
      { type: 'escape', label: 'Lose the police' },
    ],
  },
  {
    id: 'marco_debts', runner: 'marco', contact: 'contador', title: 'Wrench Work',
    intro: ['El Contador: Three names owe this office money, Marco. Your hands explain arithmetic better than my letters.', 'Visit each one. The second keeps friends who disagree — persuade them.'],
    payout: 550,
    steps: [
      { type: 'goto', x: 420, y: 1330, r: 52, label: 'Collect from the debtor in south Old Town' },
      { type: 'goto', x: 1540, y: 1750, r: 56, label: 'Collect at the Docks warehouse', fight: 2 },
      { type: 'goto', x: 2450, y: 392, r: 52, label: 'Collect from the debtor at the Marina' },
    ],
  },
  {
    id: 'marco_port', runner: 'marco', contact: 'contador', title: 'Port Run',
    intro: ['El Contador: A Furgón at the port carries papers that must reach Palm Hills tonight.', 'The port police will not wave it through. Do not stop to argue.'],
    payout: 900,
    steps: [
      { type: 'steal', x: 2660, y: 1960, r: 62, label: 'Take the Furgón at the port gate', model: 'van', color: '#95a5a6' },
      { type: 'goto', x: 200, y: 1860, r: 76, label: 'Bring the Furgón to the Palm Hills safehouse', heat: 3 },
    ],
  },
  {
    id: 'finale', runner: 'any', contact: 'carmen', title: 'Two Runners',
    intro: ['Tía Carmen: Tonight we move everything. One of you takes the yacht package at the Marina.', 'Then the other drives it out of the Docks while the whole city watches. Together, como familia.'],
    payout: 2000, requires: ['lucia_neon', 'marco_port'],
    steps: [
      { type: 'goto', x: 3130, y: 700, r: 56, label: 'Take the package at the Marina jetty' },
      { type: 'switch', label: 'Switch runner (Tab) — the other one drives' },
      { type: 'goto', x: 2660, y: 1330, r: 64, label: 'Drive the package out through the Docks gate', heat: 4 },
      { type: 'escape', label: 'Lose the police — both of you' },
    ],
  },
];
