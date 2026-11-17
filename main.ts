// Azul Heat: Two Runners — entrypoint for make.fun's gta6-01 bounty
// (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static files
// a desktop browser loads fully offline (game/index.html plus its ES
// modules — no library, no network). This program hands the entry in: it
// copies game/ and screenshots/ to the output directory and writes
// dossier.json there with the vendored make.fun library, so the judge
// reads exactly the game and the four staged screenshots.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally by serving game/ with any static file server.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (see the kit's reference/gate.json): they
// shape the dossier's source text and refuse anything the scorer would
// refuse — over 4 screenshots or one over 256 KiB, over 993 files or
// 48 MiB under game/, or a game path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
