#!/usr/bin/env node
/**
 * Fait tourner `publint` sur chaque package publiable, contre le tarball
 * *réel* que produirait `npm pack` (le même mécanisme que ci:publish, qui
 * appelle `npm publish` et non `yarn npm publish` — voir ci:publish dans le
 * package.json racine). On force explicitement --pack npm plutôt que de
 * laisser publint auto-détecter le gestionnaire de paquets via le lockfile
 * présent, pour deux raisons :
 *   1. c'est le mécanisme réellement utilisé à la publication ;
 *   2. l'auto-détection peut se tromper selon l'environnement d'exécution
 *      (CI, machine locale, etc.) et donner des faux positifs.
 *
 * Ne construit rien : il faut que `dist/` existe déjà (voir `yarn build`
 * / `turbo run build` en amont dans la CI).
 *
 * Usage : node scripts/verify-publint.mjs
 * Sortie non nulle si au moins un package a une erreur (les suggestions
 * n'échouent pas le script).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listPublishablePackages } from './shared/packages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
// Chemin absolu plutôt qu'un nom de commande nu : ne dépend d'aucun PATH
// ambiant (npm run l'augmente avec node_modules/.bin, mais un `run: node
// script.mjs` brut dans un step GitHub Actions ne le fait pas — vécu en
// direct, ce script échouait silencieusement partout jusqu'à ce commit).
const publintBin = join(rootDir, 'node_modules', '.bin', 'publint');

if (!existsSync(publintBin)) {
  console.error(`publint introuvable à ${publintBin} — as-tu lancé "yarn install" (ou npm install) à la racine ?`);
  process.exit(1);
}

const packages = listPublishablePackages(rootDir);
let hadError = false;
const skipped = [];

for (const { dir, name } of packages) {
  if (!existsSync(join(dir, 'dist'))) {
    skipped.push(name);
    continue;
  }

  console.log(`\n=== publint: ${name} ===`);
  const result = spawnSync(
    publintBin,
    ['.', '--pack', 'npm'],
    { cwd: dir, stdio: 'inherit', shell: true },
  );

  if (result.status !== 0) {
    hadError = true;
  }
}

if (skipped.length > 0) {
  console.log(`\nIgnorés (pas de dist/, package non construit) : ${skipped.join(', ')}`);
}

if (hadError) {
  console.error('\npublint a trouvé au moins une erreur bloquante ci-dessus.');
  process.exit(1);
}

console.log('\npublint : tous les packages construits sont conformes (ou seulement des suggestions).');
