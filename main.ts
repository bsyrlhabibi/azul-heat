// Azul Heat: Two Runners — entry point for the make.fun gta6-01 bounty.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier the judges grade, using the vendored buildDossier exactly as
// the kit prescribes. Deterministic: same input tree, same bytes out.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const root = new URL('.', import.meta.url).pathname;
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log('Azul Heat handed in: game/ + screenshots/ + dossier.json →', out);
