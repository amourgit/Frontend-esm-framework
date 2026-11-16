#!/usr/bin/env node
// Migration scriptée et rejouable des variables CSS du thème : `--colors-primary-500` → `--egen-colors-primary-500`
// (ADR-002, option B). Idempotent : un nom déjà préfixé n'est jamais retouché.
//
//   node scripts/migrate-theme-vars.mjs [racine=.] [--write] [--docs]
//
// Sans `--write` : rapport seul (aucun fichier modifié). `--docs` inclut le dossier docs/ (exclu par défaut : textes de
// conception qui citent volontairement les anciens noms). À rejouer sur chaque dépôt consommateur (ex. Frontend-esm-core).
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { FAMILY_PREFIX_RE, PREFIX, owner, readText, walk } from './lib/theme-vars.mjs';

const args = process.argv.slice(2);
const root = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const write = args.includes('--write');
const withDocs = args.includes('--docs');

const report = { files: 0, replacements: 0, dynamic: 0, byOwner: {} };
for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (!withDocs && rel.startsWith('docs/')) continue;
  const text = readText(file);
  let n = 0;
  let dyn = 0;
  const next = text.replace(FAMILY_PREFIX_RE, (match, family, offset) => {
    n++;
    if (!/[a-z0-9]/.test(text[offset + match.length] ?? '')) dyn++; // `--colors-#{…}` / `--panel-${…}` : nom construit
    return `--${PREFIX}-${family}-`;
  });
  if (n === 0) continue;
  report.files++;
  report.replacements += n;
  report.dynamic += dyn;
  const o = owner(file, root);
  report.byOwner[o] = (report.byOwner[o] ?? 0) + n;
  if (write) writeFileSync(file, next);
}
console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', root: relative(process.cwd(), root) || '.', ...report }, null, 2));
