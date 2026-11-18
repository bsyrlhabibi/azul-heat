'use strict';
/* Azul Heat — the six story missions, as data. A chain across both
   runners: Carmen's bakery runs, the Contador's ledger, DJ Prisma's
   nights, and one big goodbye. story.js runs them. */
AH.MISSIONS = [
  {
    title: 'First Run', from: 'Tía Carmen', giver: 'carmenBakery', reward: 400,
    intro: ['Lucía, mi cielo — the bakery van died again.', 'Carry these pastelitos to Almacén 9 in the Docks. Warm, rápido, and no police this time.'],
    stages: [
      { t: 'talk', at: 'carmenBakery', who: 'Tía Carmen', lines: [
        ['Tía Carmen', 'There she is! My fastest niece.'],
        ['Lucía', 'Courier, tía. "Fastest niece" is not a job title.'],
        ['Tía Carmen', 'Take the boxes to Almacén 9. If the police ask, they are for a wedding.'],
      ] },
      { t: 'drive', at: 'warehouse', label: 'Deliver the pastelitos to Almacén 9' },
    ],
    outro: ['Delivered warm. You are the best, mi cielo.', 'Come by the bakery — $400 and a cafecito.'],
  },
  {
    title: 'The Ledger', from: 'El Contador', giver: 'contadorOffice', reward: 650,
    intro: ['Señor Reyes. A name in my ledger has gone quiet: Rico Salas, Old Town.', 'Collect what he owes. Politely. The money talks, you listen.'],
    stages: [
      { t: 'talk', at: 'contadorOffice', who: 'El Contador', lines: [
        ['El Contador', 'Marco Reyes. Your hands fix engines; today they fix a debt.'],
        ['Marco', 'I collect, nobody gets hurt. That is the whole service.'],
        ['El Contador', 'Salas. Old Town. He will pay — they always pay a Reyes.'],
      ] },
      { t: 'goto', at: { x: 420, y: 1750 }, label: 'Find Rico Salas in Old Town' },
      { t: 'talk', at: { x: 420, y: 1750 }, who: 'Rico Salas', lines: [
        ['Rico Salas', 'Reyes? I— okay. Okay! Here, the whole envelope.'],
        ['Marco', 'Pleasure doing business, Rico. Pay on time next month.'],
        ['Rico Salas', '¡Policía! That man took my— (he is shouting. Time to go.)'],
      ] },
      { t: 'escape', label: 'Lose the police', heat: 2 },
      { t: 'drive', at: 'contadorOffice', label: 'Bring the envelope to El Contador' },
    ],
    outro: ['The ledger balances again. $650, and my thanks.', 'Quiet work suits you, Reyes.'],
  },
  {
    title: "Prisma's Night", from: 'DJ Prisma', giver: 'clubPrisma', reward: 550,
    intro: ['LUCÍA. My ride bailed and the Marina set starts SOON.', 'Club Prisma, now. Bring wheels with a pulse.'],
    stages: [
      { t: 'talk', at: 'clubPrisma', who: 'DJ Prisma', lines: [
        ['DJ Prisma', 'You came! The pier crowd is already dancing to silence.'],
        ['Lucía', 'Get in, estrella. I will beat the sunset there.'],
        ['DJ Prisma', 'If we make it before the light goes, the night is ours.'],
      ] },
      { t: 'timed', at: 'pier', secs: 150, label: 'Drive DJ Prisma to Muelle Azul Pier' },
    ],
    outro: ['THAT entrance. The whole pier heard us arrive.', '$550 — and you are on the guest list forever.'],
  },
  {
    title: 'Hot Cargo', from: 'El Contador', giver: 'warehouse', reward: 900, failOnBust: true,
    intro: ['A truck at Almacén 9 holds… merchandise. The buyer waits at a Palm Hills villa.', 'Every camera in Bahía Azul will be watching. Drive like water, Reyes.'],
    stages: [
      { t: 'goto', at: 'warehouse', label: 'Reach Almacén 9 in the Docks' },
      { t: 'drive', at: { x: 265, y: 345 }, label: 'Deliver the cargo to the Palm Hills villa', heat: 3 },
    ],
    outro: ['The buyer is satisfied. $900, no questions either way.', 'You drive like water indeed.'],
  },
  {
    title: 'Two Runners', from: 'Tía Carmen', giver: 'carmenBakery', reward: 1100,
    intro: ['A big order, mi cielo — too big for one runner.', 'You take the boxes; Marco brings the van to Club Prisma. Two runners, one family.'],
    stages: [
      { t: 'talk', at: 'carmenBakery', who: 'Tía Carmen', lines: [
        ['Tía Carmen', 'Tonight the whole family works. Lucía — the boxes.'],
        ['Lucía', 'And Marco takes the van to Prisma. On it, tía.'],
        ['Tía Carmen', 'Switch to Marco when you are ready (TAB). ¡Ándale!'],
      ] },
      { t: 'switch', label: 'Switch to the other runner (TAB)' },
      { t: 'drive', at: 'clubPrisma', label: 'Bring the van to Club Prisma' },
    ],
    outro: ['My two runners. The Ferros eat well tonight.', '$1,100 — and my eternal cafecitos.'],
  },
  {
    title: 'The Big Goodbye', from: 'DJ Prisma', giver: 'clubPrisma', reward: 2000,
    intro: ['Last set ever at Club Prisma, and the Contador holds my farewell fee.', 'Pick it up from his office. Then the pier — we burn the night down together.'],
    stages: [
      { t: 'talk', at: 'clubPrisma', who: 'DJ Prisma', lines: [
        ['DJ Prisma', 'One last night, runners. The fee is at the Contador\'s office.'],
        ['Lucía', 'And when the police come?'],
        ['DJ Prisma', 'They will. Drive like the song is ending.'],
      ] },
      { t: 'drive', at: 'contadorOffice', label: 'Collect the farewell fee from El Contador', heat: 4 },
      { t: 'drive', at: 'pier', label: 'Reach Muelle Azul Pier — burn the night down' },
    ],
    outro: ['WE DID IT. Bahía Azul will talk about this night for years.', '$2,000. Two runners, one legend. THE END — free roam is yours.'],
  },
];
