// main.ts — hands this entry in: copies game/ and screenshots/ to the output
// directory and writes dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 standard library only; deterministic: two runs write identical bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoDir = new URL('.', import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const dest = join(outDir, name);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(join(repoDir, name), dest, { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written: ${dossier.length} bytes -> ${join(outDir, 'dossier.json')}`);
