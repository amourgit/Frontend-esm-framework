#!/usr/bin/env node
/**
 * Reprise de `yarn ci:publish` après une limite de débit npm (E429).
 *
 * npm applique une limite de débit sur les publications successives,
 * plus stricte pour un scope/compte récent (constaté : ~25 publications
 * d'affilée avant blocage, cf. retours de la communauté npm sur des cas
 * similaires — pas de chiffre officiel documenté précisément par npm).
 *
 * Ce script est idempotent et sans risque à relancer : il interroge le
 * vrai registre npm pour savoir ce qui est déjà publié, ignore ces
 * packages, et ne publie que ce qui manque, dans l'ordre topologique
 * réel (dependencies + peerDependencies internes), avec une pause entre
 * chaque publication et un retry à backoff exponentiel spécifiquement
 * sur les erreurs 429.
 *
 * Usage :
 *   export NPM_TOKEN=npm_xxxxxxxxxxxx
 *   node scripts/publish-remaining.mjs
 *
 * Options :
 *   --dry-run           n'exécute aucun npm publish, affiche juste le plan
 *   --delay=<ms>         pause entre deux publications réussies (défaut 20000)
 *   --tag=<tag>          tag npm (défaut "latest")
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPublishablePackages } from './shared/packages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELAY_MS = Number(args.find((a) => a.startsWith('--delay='))?.split('=')[1] ?? 20000);
const TAG = args.find((a) => a.startsWith('--tag='))?.split('=')[1] ?? 'latest';
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toposort(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const visited = new Map();
  const order = [];

  function visit(name) {
    if (visited.get(name) === 'done') return;
    visited.set(name, 'visiting');
    const pkg = byName.get(name);
    if (pkg) {
      const deps = {
        ...pkg.pkg.dependencies,
        ...pkg.pkg.peerDependencies,
      };
      for (const dep of Object.keys(deps)) {
        if (byName.has(dep)) visit(dep);
      }
    }
    visited.set(name, 'done');
    if (pkg) order.push(pkg);
  }

  for (const p of packages) visit(p.name);
  return order;
}

async function isAlreadyPublished(name, version) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`);
  return res.status === 200;
}

async function publishOne(dir, name) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = spawnSync('npm', ['publish', '--access', 'public', '--tag', TAG], {
      cwd: dir,
      encoding: 'utf8',
      shell: true,
    });
    const output = (result.stdout || '') + (result.stderr || '');
    console.log(output.trim());

    if (result.status === 0) {
      return true;
    }

    if (/E429|Too Many Requests|rate limit/i.test(output)) {
      const wait = Math.min(60_000 * 2 ** (attempt - 1), 15 * 60_000); // 1min, 2min, 4min, 8min, plafonné à 15min
      console.log(`\n429 reçu pour ${name} (essai ${attempt}/${MAX_RETRIES}) — attente ${Math.round(wait / 1000)}s avant nouvelle tentative...\n`);
      await sleep(wait);
      continue;
    }

    // Erreur non liée au rate limit (ex: déjà publié entre-temps, erreur de credentials...) : on arrête là pour ce package.
    console.error(`\nÉchec non lié au rate limit pour ${name}, abandon de ce package (voir sortie ci-dessus).\n`);
    return false;
  }
  console.error(`\n${name} : rate limit toujours actif après ${MAX_RETRIES} tentatives. Relancer ce script plus tard.\n`);
  return false;
}

async function main() {
  const all = listPublishablePackages(rootDir);
  const ordered = toposort(all);

  console.log(`${ordered.length} packages publiables au total. Vérification du registre npm...\n`);

  const toPublish = [];
  for (const { name, version } of ordered) {
    const published = await isAlreadyPublished(name, version);
    console.log(`${published ? 'déjà publié ' : 'À PUBLIER   '} ${name}@${version}`);
    if (!published) toPublish.push(ordered.find((p) => p.name === name));
  }

  console.log(`\n${toPublish.length} package(s) restant(s) à publier, dans cet ordre :`);
  for (const p of toPublish) console.log(`  - ${p.name}`);

  if (DRY_RUN) {
    console.log('\n--dry-run : aucune publication effectuée.');
    return;
  }

  if (toPublish.length === 0) {
    console.log('\nRien à faire, tout est déjà publié.');
    return;
  }

  console.log('');
  let failures = 0;
  for (let i = 0; i < toPublish.length; i++) {
    const { dir, name, version } = toPublish[i];
    console.log(`\n=== [${i + 1}/${toPublish.length}] Publication de ${name}@${version} ===`);
    const ok = await publishOne(dir, name);
    if (!ok) {
      failures++;
      continue;
    }
    if (i < toPublish.length - 1) {
      console.log(`Pause de ${DELAY_MS / 1000}s avant la prochaine publication...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nTerminé : ${toPublish.length - failures}/${toPublish.length} publications réussies.`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
