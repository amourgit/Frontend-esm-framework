#!/usr/bin/env node
// A2 — inventaire d'un `dist` du shell : nombre de fichiers et poids par type, plus gros fichiers, présence d'un
// service worker. Reproductible : `node scripts/inventory-dist.mjs <dossier> [--top=N]`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const [, , dir, ...flags] = process.argv;
if (!dir) {
  console.error('usage : node scripts/inventory-dist.mjs <dossier-dist> [--top=N]');
  process.exit(1);
}
const top = Number(flags.find((f) => f.startsWith('--top='))?.slice(6) ?? 5);

const files = [];
(function walk(d) {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const path = join(d, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push({ path: relative(dir, path), size: statSync(path).size });
  }
})(dir);

const kind = (p) => (p.endsWith('.map') ? '.map' : extname(p) || '(sans extension)');
const byKind = new Map();
for (const f of files) {
  const k = kind(f.path);
  const entry = byKind.get(k) ?? { count: 0, size: 0 };
  entry.count++;
  entry.size += f.size;
  byKind.set(k, entry);
}
const total = files.reduce((sum, f) => sum + f.size, 0);
const mo = (n) => (n / 1e6).toFixed(1);

console.log(`Total : ${mo(total)} Mo, ${files.length} fichiers\n`);
console.log('| Type | Fichiers | Poids (Mo) | Part |\n|---|---|---|---|');
for (const [k, { count, size }] of [...byKind].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`| \`${k}\` | ${count} | ${mo(size)} | ${Math.round((size / total) * 100)} % |`);
}
console.log(`\nPlus gros fichiers :`);
for (const f of [...files].sort((a, b) => b.size - a.size).slice(0, top)) console.log(`- ${mo(f.size)} Mo — \`${f.path}\``);

const sw = files.filter((f) => /(^|\/)(sw|service-worker|workbox)[^/]*\.js$/i.test(f.path));
const swRef = files.some((f) => f.path.endsWith('.html') && /serviceWorker/.test(readFileSync(join(dir, f.path), 'utf8')));
console.log(`\nService worker : ${sw.length === 0 && !swRef ? 'aucun (fichier ni référence dans le HTML)' : `PRÉSENT (${sw.map((f) => f.path).join(', ') || 'référence dans le HTML'})`}`);
