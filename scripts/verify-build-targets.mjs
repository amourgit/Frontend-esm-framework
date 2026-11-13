#!/usr/bin/env node
// H6 — construit le shell pour les 3 cibles (web, android, ios) et contrôle l'artefact, puis vérifie que les règles de
// validation natives (B1) FONT ÉCHOUER le build. Réutilise `e2e/build-artifact.mjs` (artefacts minimaux, déjà testés en e2e).
//
//   node scripts/verify-build-targets.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = join(root, 'packages/shell/esm-app-shell');
const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${message}`);
  if (!ok) failures.push(message);
  return ok;
};

function build(target) {
  const result = spawnSync('node', ['e2e/build-artifact.mjs', target], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
  }
  return result.status === 0;
}

for (const target of ['web', 'android', 'ios']) {
  console.log(`\n[${target}]`);
  if (!check(build(target), `build de la cible ${target}`)) continue;
  const html = readFileSync(join(root, 'e2e/.artifact', target, 'index.html'), 'utf8');
  if (target === 'web') {
    check(!/Content-Security-Policy/i.test(html), 'aucune CSP (HTML Web inchangé)');
    check(!html.includes('egenTarget'), 'aucun pont egenTarget (l’absence vaut web)');
  } else {
    check(/Content-Security-Policy/i.test(html), 'CSP présente');
    check(!html.includes("'unsafe-eval'"), "CSP sans 'unsafe-eval'");
    check(html.includes("connect-src 'self' https://api.test.local"), 'connect-src limité à l’origine de l’API');
    // Sous CSP `script-src 'self'`, le pont est dans `bootstrap-head.<hash>.js` (script externe), pas dans le HTML.
    const head = html.match(/src="\/app\/(bootstrap-head\.[^"]+\.js)"/)?.[1];
    const headSource = head ? readFileSync(join(root, 'e2e/.artifact', target, head), 'utf8') : '';
    check(new RegExp(`egenTarget["']?\\s*:\\s*["']${target}["']`).test(headSource), `pont window.egenTarget = ${target}`);
    check(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html.replace(/<script[^>]*type="(?:systemjs-importmap|egen-routes)"[^>]*>[\s\S]*?<\/script>/gi, '')), 'aucun script inline exécutable');
    check(!/<script[^>]+src=["']https?:/i.test(html), 'aucun script distant');
  }
}

console.log('\n[règles B1 : le build natif doit échouer]');
const nativeEnv = {
  EGEN_TARGET: 'android',
  EGEN_ENV: 'production',
  NODE_ENV: 'production',
  EGEN_API_URL: 'https://api.test.local',
  EGEN_OFFLINE: 'disable',
  EGEN_ESM_IMPORTMAP: JSON.stringify({ imports: { '@e2e/fake': '/app/e2e-fake.js' } }),
  EGEN_ROUTES: JSON.stringify({ '@e2e/fake': { pages: [{ component: 'root', route: 'e2e' }] } }),
};
const negatives = [
  ['EGEN_API_URL en http://', { EGEN_API_URL: 'http://api.test.local' }, 'EGEN_API_URL'],
  ['EGEN_ENV=development', { EGEN_ENV: 'development' }, 'EGEN_ENV'],
  ['EGEN_DEV_NO_AUTH=true', { EGEN_DEV_NO_AUTH: 'true' }, 'EGEN_DEV_NO_AUTH'],
  ['import map vide', { EGEN_ESM_IMPORTMAP: '{}' }, 'EGEN_ESM_IMPORTMAP'],
  ['EGEN_ROUTES_URL distant', { EGEN_ROUTES_URL: 'https://x.test/routes.json' }, 'EGEN_ROUTES_URL'],
  ['cible inconnue', { EGEN_TARGET: 'windows' }, 'EGEN_TARGET inconnu'],
];
for (const [label, override, expected] of negatives) {
  const result = spawnSync('yarn', ['rspack', '--mode', 'production'], {
    cwd: shell,
    env: { ...process.env, ...nativeEnv, ...override },
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`;
  check(result.status !== 0 && output.includes(expected), `${label} ⇒ build refusé (« ${expected} »)`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} contrôle(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les cibles et règles B1 sont conformes.');
