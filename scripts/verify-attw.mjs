#!/usr/bin/env node
/**
 * Fait tourner `@arethetypeswrong/cli` (attw) sur chaque package publiable
 * déjà construit, contre le tarball réel produit par `npm pack`.
 *
 * Contrairement à publint (qui vérifie la forme du package.json/exports),
 * attw vérifie que les *types* du package se résolvent correctement selon
 * le mode de résolution du consommateur (node10, node16 CJS/ESM, bundler).
 * Ça nécessite de résoudre les dépendances internes @egen-civitas/* du
 * package testé — ce qui ne fonctionne de façon fiable que si ces
 * dépendances sont réellement publiées sur le registre (voir le README :
 * ce script est resté volontairement débranché de la CI tant que ce
 * n'était pas le cas — voir historique git de ce fichier).
 *
 * Usage : node scripts/verify-attw.mjs
 * Sortie non nulle si au moins un package a un problème 💀 ou 🥴 (les
 * avertissements ⚠️ n'échouent pas le script — ce sont des choix de design
 * ESM-only assumés, pas des erreurs de résolution).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listPublishablePackages } from './shared/packages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const attwBin = join(rootDir, 'node_modules', '.bin', 'attw');

if (!existsSync(attwBin)) {
  console.error(`attw introuvable à ${attwBin} — as-tu lancé "yarn install" (ou npm install) à la racine ?`);
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

  console.log(`\n=== attw: ${name} ===`);
  const result = spawnSync(attwBin, ['--pack', '.'], { cwd: dir, encoding: 'utf8', shell: true });
  const output = (result.stdout || '') + (result.stderr || '');
  console.log(output.trim());

  // attw sort avec un code non nul des qu'il y a un probleme, y compris de
  // simples avertissements ⚠️ (ex: CJSResolvesToESM, un choix ESM-only
  // assume dans ce repo). On ne fait echouer CE script que sur un vrai
  // probleme de resolution (le texte de sortie contient alors 💀 ou 🥴).
  if (/💀|🥴/.test(output)) {
    hadError = true;
  }
}

if (skipped.length > 0) {
  console.log(`\nIgnorés (pas de dist/, package non construit) : ${skipped.join(', ')}`);
}

if (hadError) {
  console.error('\nattw a trouvé au moins une vraie erreur de résolution (💀/🥴) ci-dessus.');
  process.exit(1);
}

console.log('\nattw : aucune erreur de résolution bloquante (des ⚠️ isolés sur des choix ESM-only assumés sont normaux).');
