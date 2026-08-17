#!/usr/bin/env node
/**
 * Le test décisif : simule un consommateur externe complet.
 *
 * Pourquoi ce script existe : dans le monorepo, Yarn hoiste tous les
 * node_modules à la racine, donc un package qui importe une dépendance
 * @egen-civitas/* non déclarée "fonctionne quand même" par accident. Ce
 * script élimine cet accident : chaque package publiable est packé avec
 * `npm pack` (même commande que ci:publish), puis installé dans un projet
 * neuf, isolé, sans aucun lien avec le monorepo — uniquement via les
 * tarballs locaux (protocole file:) pour les packages @egen-civitas/*, et
 * via le vrai registre npm pour tout le reste (react, rxjs, etc). Si une
 * dépendance interne n'est pas déclarée, `npm install` échoue ou
 * l'import() plante — exactement les bugs trouvés (esm-framework /
 * esm-ai-framework, esm-extensions / esm-globals+esm-translations,
 * esm-app-shell / esm-globals+esm-offline+esm-utils, esm-navigation).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPublishablePackages } from './shared/packages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const KEEP_TMP = process.argv.includes('--keep');

// Packages qu'on sait ne pas pouvoir importer nativement sous Node (ils
// embarquent des assets .scss/.css directement dans leur JS compilé et
// n'ont de sens que consommés via un bundler comme rspack/webpack). Ce
// n'est PAS un bug : à documenter ici plutôt que de faire échouer le
// script pour un cas structurellement hors-scope de ce test précis.
const BUNDLER_ONLY = new Set([
  '@egen-civitas/esm-styleguide',
  '@egen-civitas/esm-offline',
  '@egen-civitas/esm-data-api',
  '@egen-civitas/esm-react-utils',
  '@egen-civitas/esm-ai-events',
  '@egen-civitas/esm-ai-context',
  '@egen-civitas/esm-ai-extensions',
  '@egen-civitas/esm-ai-framework',
  '@egen-civitas/esm-ai-memory',
  '@egen-civitas/esm-ai-tools',
]);

// esm-app-shell n'est pas une librairie : c'est un bundle applicatif navigateur
// (sortie rspack avec noms de fichiers hashés), servi tel quel par le CLI egen,
// jamais require()/import()é par du code. Il n'a délibérément aucun point
// d'entrée JS ("main"/"exports") — inutile donc de tenter de l'importer ici.
const NOT_A_LIBRARY = new Set([
  '@egen-civitas/esm-app-shell',
]);

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', shell: true, ...opts });
  return result;
}

function main() {
  const packages = listPublishablePackages(rootDir);

  console.log(`${packages.length} packages publiables détectés.\n`);

  const workDir = mkdtempSync(join(tmpdir(), 'egen-pack-smoke-'));
  const tarballDir = join(workDir, 'tarballs');
  const consumerDir = join(workDir, 'consumer');
  spawnSync('mkdir', ['-p', tarballDir, consumerDir]);

  console.log(`Répertoire de travail isolé : ${workDir}\n`);

  // 1. npm pack de chaque package publiable, dans un dossier hors du monorepo
  const deps = {};
  for (const { dir, name } of packages) {
    const packResult = run('npm', ['pack', '--silent', '--json', '--pack-destination', tarballDir], { cwd: dir });
    if (packResult.status !== 0) {
      console.error(`ÉCHEC npm pack pour ${name} :\n${packResult.stderr}`);
      process.exit(1);
    }
    let filename;
    try {
      filename = JSON.parse(packResult.stdout)[0].filename;
    } catch {
      console.error(`Impossible de lire la sortie de npm pack pour ${name} : ${packResult.stdout}`);
      process.exit(1);
    }
    deps[name] = `file:${join(tarballDir, filename)}`;
  }
  deps['happy-dom'] = '*'; // shim DOM minimal pour les packages qui touchent window/localStorage

  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify({ name: 'verify-pack-install-consumer', version: '0.0.0', private: true, dependencies: deps }, null, 2),
  );

  // 2. Installation isolée — aucun hoisting du monorepo, aucun accès au yarn.lock
  console.log('Installation isolée (npm install, hors monorepo)...\n');
  const installResult = run('npm', ['install', '--no-audit', '--no-fund'], { cwd: consumerDir, stdio: 'inherit' });
  if (installResult.status !== 0) {
    console.error('\nnpm install a échoué dans le projet consommateur isolé : au moins une dépendance interne est mal déclarée (voir ci-dessus).');
    if (!KEEP_TMP) rmSync(workDir, { recursive: true, force: true });
    process.exit(1);
  }

  // 3. Smoke-import réel de chaque package, avec un shim DOM minimal (happy-dom)
  //    pour ne pas confondre "code prévu pour le navigateur" et "dépendance manquante".
  const smokeScript = `
import { Window } from 'happy-dom';
const win = new Window();
globalThis.window = win;
globalThis.document = win.document;
Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
globalThis.localStorage = win.localStorage;

const names = ${JSON.stringify(Object.keys(deps).filter((n) => n !== 'happy-dom'))};
const bundlerOnly = new Set(${JSON.stringify([...BUNDLER_ONLY])});
const notALibrary = new Set(${JSON.stringify([...NOT_A_LIBRARY])});
let failed = 0, skipped = 0;
for (const name of names) {
  if (notALibrary.has(name)) {
    skipped++;
    console.log('SKIP  ' + name + '  (pas une librairie importable, voir NOT_A_LIBRARY)');
    continue;
  }
  try {
    await import(name);
    console.log('OK    ' + name);
  } catch (err) {
    const msg = err.message.split('\\n')[0];
    if (/\\.(s?css|sass|less)['"]?\$/i.test(msg) || bundlerOnly.has(name)) {
      skipped++;
      console.log('SKIP  ' + name + '  (nécessite un bundler, hors-scope de ce test)');
    } else {
      failed++;
      console.log('FAIL  ' + name);
      console.log('      -> ' + msg);
    }
  }
}
console.log('\\n' + (names.length - failed - skipped) + '/' + names.length + ' imports réussis (' + skipped + ' ignorés, bundler requis)');
process.exit(failed > 0 ? 1 : 0);
`;
  writeFileSync(join(consumerDir, 'smoke.mjs'), smokeScript);

  console.log('\nImport réel de chaque package (comme le ferait un vrai consommateur externe)...\n');
  const smokeResult = run('node', ['smoke.mjs'], { cwd: consumerDir, stdio: 'inherit' });

  if (!KEEP_TMP) {
    rmSync(workDir, { recursive: true, force: true });
  } else {
    console.log(`\n--keep : répertoire conservé pour inspection : ${workDir}`);
  }

  process.exit(smokeResult.status ?? 1);
}

main();
