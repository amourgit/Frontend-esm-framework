#!/usr/bin/env node
// Inventaire reproductible des consommateurs du thème EGEN (DS-1) : imports d'`esm-theme`, variables CSS du thème,
// clés de stockage. Usage : node scripts/inventory-theme.mjs [racine=.] [--md]
import { relative, resolve } from 'node:path';
import { FAMILIES, VAR_RE, owner, readText, walk } from './lib/theme-vars.mjs';

const args = process.argv.slice(2);
const root = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const asMd = args.includes('--md');

const perOwner = new Map();
const entry = (o) => perOwner.get(o) ?? perOwner.set(o, { files: 0, vars: 0, families: {}, imports: 0, egenLegacy: new Set(), storage: new Set() }).get(o);
const distinct = new Set();

for (const file of walk(root)) {
  const text = readText(file);
  const o = owner(file, root);
  const e = entry(o);
  let touched = false;
  for (const m of text.matchAll(VAR_RE)) {
    e.vars++;
    e.families[m[1]] = (e.families[m[1]] ?? 0) + 1;
    distinct.add(`--${m[1]}-${m[2]}`);
    touched = true;
  }
  if (touched) e.files++;
  e.imports += (text.match(/@egen-civitas\/esm-theme/g) ?? []).length;
  for (const m of text.matchAll(/--egen-[a-z0-9-]+/g)) e.egenLegacy.add(m[0]);
  for (const m of text.matchAll(/['"`](egen-theme-[a-z-]+)['"`]/g)) e.storage.add(m[1]);
}

const rows = [...perOwner.entries()].filter(([, v]) => v.vars || v.imports || v.egenLegacy.size || v.storage.size).sort((a, b) => b[1].vars - a[1].vars);
const total = rows.reduce((n, [, v]) => n + v.vars, 0);

if (!asMd) {
  console.log(JSON.stringify({ root: relative(process.cwd(), root) || '.', totalRefs: total, distinctVars: distinct.size, owners: Object.fromEntries(rows.map(([k, v]) => [k, { ...v, egenLegacy: [...v.egenLegacy], storage: [...v.storage] }])) }, null, 2));
} else {
  const out = [`# Inventaire des consommateurs du thème`, '', `Généré par \`node scripts/inventory-theme.mjs --md\` — familles : ${FAMILIES.map((f) => `\`${f}\``).join(', ')}.`, '', `**${total} références** à **${distinct.size} variables distinctes** dans ${rows.filter(([, v]) => v.vars).length} paquets.`, '', '| Paquet | Fichiers | Références | Imports `esm-theme` | Variables `--egen-*` existantes | Clés de stockage |', '|---|---:|---:|---:|---|---|'];
  for (const [k, v] of rows) out.push(`| \`${k}\` | ${v.files} | ${v.vars} | ${v.imports} | ${[...v.egenLegacy].map((x) => `\`${x}\``).join(', ') || '—'} | ${[...v.storage].map((x) => `\`${x}\``).join(', ') || '—'} |`);
  console.log(out.join('\n'));
}
