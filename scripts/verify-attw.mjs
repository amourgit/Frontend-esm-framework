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
 * Sortie non nulle si au moins un package a un problème 💀 ou 🥴 sur les
 * résolutions node16 (CJS/ESM) ou bundler (les avertissements ⚠️
 * n'échouent pas le script — ce sont des choix de design ESM-only
 * assumés, pas des erreurs de résolution). node10 est délibérément exclu
 * de l'analyse (voir plus bas).
 *
 * Règle "internal-resolution-error" ignorée volontairement : contrairement
 * à verify-pack-install.mjs (qui substitue chaque @egen-civitas/* par un
 * tarball local file: avant d'installer), `attw --pack .` installe le
 * tarball d'UN SEUL package dans un répertoire temporaire isolé et résout
 * ses dépendances @egen-civitas/* depuis le vrai registre npm. Lors d'une
 * release qui bump plusieurs packages liés entre eux dans le même
 * changeset (updateInternalDependencies: "patch"), le package.json d'un
 * package référence alors la nouvelle version d'un autre package du même
 * changeset AVANT que cette étape de publication n'ait eu lieu (attw
 * tourne avant "Create Release Pull Request or Publish" dans release.yml)
 * — cette version n'existe donc pas encore sur le registre au moment du
 * test, et attw le rapporte comme une erreur de résolution interne. Ce
 * n'est pas un défaut de typage réel : une fois la publication effectuée,
 * la même vérification passerait. Toutes les autres règles restent
 * actives (💀 no-resolution / untyped-resolution, etc. continuent de
 * bloquer normalement).
 * Profil "node16" (plutôt que "strict", le défaut) : la résolution node10
 * (legacy, pré-Node 12, ignore totalement le champ "exports") ne peut PAR
 * CONSTRUCTION pas résoudre un sous-chemin dont le nom public (ex.
 * "./src/public") ne correspond pas à un fichier physique réel au même
 * chemin depuis la racine du package — ce dépôt utilise ce motif de façon
 * cohérente et volontaire sur la quasi-totalité de ses packages (le nom
 * du sous-chemin reflète l'arborescence de `src/`, le fichier livré vit
 * dans `dist/`). Aucune restructuration de fichiers ne peut satisfaire
 * node10 sans abandonner cette convention. Ce framework cible du tooling
 * moderne (Rspack, Module Federation, Yarn Berry, bundlers actuels) : la
 * compatibilité node10 n'a jamais été un objectif. node16 (CJS/ESM) et
 * bundler restent entièrement vérifiés et bloquants.
 *
 * Sous-chemins SCSS exclus de l'analyse : certains packages (ex.
 * esm-styleguide) exposent des sous-chemins comme "./styles" ou
 * "./src/vars" uniquement via une condition "sass" (consommée par des
 * imports Sass, `@use '@egen-civitas/x/styles'`), sans aucune condition
 * "types"/JS. attw les traite comme des imports JS/TS ordinaires et les
 * rapporte à tort en échec de résolution. On détecte et exclut
 * automatiquement (--exclude-entrypoints) tout sous-chemin dont la seule
 * condition déclarée est "sass" (pas de "types") — ce n'est pas un
 * contournement au cas par cas, ça généralise à tout futur package du
 * même motif.
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

for (const { dir, name, pkg } of packages) {
  if (!existsSync(join(dir, 'dist'))) {
    skipped.push(name);
    continue;
  }

  // Sous-chemins exposés uniquement via une condition "sass" (pas de
  // "types") : ce ne sont pas des modules JS/TS, attw n'a rien à y
  // vérifier — voir commentaire d'en-tête.
  const sassOnlyEntrypoints = Object.entries(pkg.exports || {})
    .filter(([, target]) => typeof target === 'object' && target !== null && 'sass' in target && !('types' in target))
    .map(([subpath]) => subpath);

  const attwArgs = ['--pack', '.', '--profile', 'node16', '--ignore-rules', 'internal-resolution-error'];
  if (sassOnlyEntrypoints.length > 0) {
    attwArgs.push('--exclude-entrypoints', ...sassOnlyEntrypoints);
  }

  console.log(`\n=== attw: ${name} ===`);
  const result = spawnSync(attwBin, attwArgs, { cwd: dir, encoding: 'utf8', shell: true });
  const output = (result.stdout || '') + (result.stderr || '');
  console.log(output.trim());

  // attw continue d'afficher les problèmes des résolutions/règles ignorées,
  // préfixés par "(ignored ...)" — texte informatif, pas un vrai échec. On
  // les retire avant de chercher 💀/🥴 pour ne pas les compter à tort.
  const outputWithoutIgnored = output.replace(/\(ignored[^)]*\)[^\n]*/g, '');

  // attw sort avec un code non nul des qu'il y a un probleme, y compris de
  // simples avertissements ⚠️ (ex: CJSResolvesToESM, un choix ESM-only
  // assume dans ce repo). On ne fait echouer CE script que sur un vrai
  // probleme de resolution (le texte de sortie contient alors 💀 ou 🥴).
  if (/💀|🥴/.test(outputWithoutIgnored)) {
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
