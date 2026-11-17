// Azul Heat: Two Runners — hand-in program for the gta6-01 bounty (Node 22, standard
// library only). The game itself is the game/ folder beside this file: plain static files
// a desktop browser runs offline. This program copies game/ and screenshots/ into the
// output directory and writes dossier.json there with the vendored make.fun library, so
// the judge reads exactly the bytes that were handed in. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader's container.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(entryDir, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(entryDir, 'screenshots'))) {
  cpSync(join(entryDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own: at most 4 screenshots of 256 KiB each, at most 993 files
// and 48 MiB under game/, no game/ path over 1000 bytes, and the dossier's source text
// capped at 160 KiB so every source file reaches the judge whole.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
