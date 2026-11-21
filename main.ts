// NIGHT SHIFT: THE ARCHIVE — the hand-in program for make.fun's
// best-stealth-game-20261121-1759 bounty (program/v1, Node 22, stdlib only).
//
// It stages the entry in /output: the playable static game under game/, the
// four screenshots under screenshots/, and dossier.json — the summary the
// judge reads — written by the kit's buildDossier from vendor/makefun-game.ts.
//
// The program never deletes /output and never fetches anything: it only copies
// files that already sit beside it and writes the dossier from them, so two
// runs over the same repository produce the same bytes. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the folder this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });

// Stage the game first, then the screenshots beside it.
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the sealed gate re-derives and compares byte for byte.
// Caps mirror the gate's own limits, so a local run refuses what the
// grader would refuse: at most 4 screenshots of 256 KiB, at most 993
// game files totalling 48 MiB, and a source text cap of 160 KiB.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierText);
