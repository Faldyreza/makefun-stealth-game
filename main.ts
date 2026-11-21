// main.ts — hands this entry in. It is the program the grader runs:
// copy the static game and the screenshots beside this file into the
// output folder, then write the dossier the judge reads, using the
// vendored make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output. Run it twice and both runs must agree byte
// for byte, so nothing here depends on the clock or the environment.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('./', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output folder so a stale file can never leak in.
mkdirSync(destination, { recursive: true });
rmSync(join(destination, 'game'), { recursive: true, force: true });
rmSync(join(destination, 'screenshots'), { recursive: true, force: true });
rmSync(join(destination, 'dossier.json'), { force: true });

cpSync(join(repoRoot, 'game'), join(destination, 'game'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

// Caps from the competition's gate: dossier text at most 160 KiB, at most
// four screenshots of at most 256 KiB each, game/ at most 993 files and
// 48 MiB, and no game path longer than 1000 bytes.
const dossierText = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(destination, 'dossier.json'), dossierText);
