#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { checkEmbedApp, hasErrors } from '../dist/check.js';

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  return i === -1 ? undefined : args[i + 1];
};
if (args.includes('--help') || !opt('--manifest')) {
  console.log(`egen-embed-check — vérifie une app embarquée (manifeste, capacités, intégrabilité en iframe)

Usage : egen-embed-check --manifest egen-config.json [--shell https://egen.exemple.org] [--probe] [--allow-localhost]

  --shell            origine du Shell EGEN (contrôle CSP frame-ancestors)
  --probe            interroge l'URL de l'app : en-têtes X-Frame-Options / CSP, et déclaration publiée à <url>/egen-config.json
  --allow-localhost  tolère http://localhost (développement)

Code de sortie : 1 si au moins une erreur.`);
  process.exit(opt('--manifest') ? 0 : 1);
}
let manifest;
try {
  manifest = JSON.parse(await readFile(opt('--manifest'), 'utf8'));
} catch (e) {
  console.error(`✗ manifeste illisible : ${e.message}`);
  process.exit(1);
}
const issues = await checkEmbedApp({ manifest, shellOrigin: opt('--shell'), probe: args.includes('--probe'), allowInsecureLocalhost: args.includes('--allow-localhost') });
const sym = { error: '✗', warn: '!', info: 'i' };
for (const i of issues) console.log(`${sym[i.level]} ${i.message}`);
if (!issues.length) console.log('✔ aucune remarque');
process.exit(hasErrors(issues) ? 1 : 0);
