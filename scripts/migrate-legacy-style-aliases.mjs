#!/usr/bin/env node
// Suppression de la couche « alias historiques » du styleguide (refonte du Design System, §27 : l'ancien système doit disparaître).
//
//   node scripts/migrate-legacy-style-aliases.mjs [racine=.] [--write]
//
// 1. `$ui-01`, `$text-02`, `$brand-primary-10`… (couleurs Carbon figées, valeurs hex de repli) → `var(--egen-colors-…)` direct.
// 2. `@include brand-01(prop)` / `var(--brand-01)` (teal codé en dur) → `var(--egen-colors-primary-600)` etc.
// 3. Repli hexadécimal `var(--egen-…, #hex)` → `var(--egen-…)` : une seule source de vérité, le thème.
// Idempotent. À rejouer sur chaque dépôt consommateur (ex. Frontend-esm-core) AVANT de mettre à jour le styleguide.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ALIASES = {
  'ui-01': 'var(--egen-colors-surface-muted)',
  'ui-02': 'var(--egen-colors-surface-card)',
  'ui-03': 'var(--egen-colors-border-default)',
  'ui-04': 'var(--egen-colors-surface-muted-foreground)',
  'ui-05': 'var(--egen-colors-surface-foreground)',
  'text-02': 'var(--egen-colors-surface-muted-foreground)',
  'text-03': 'var(--egen-colors-surface-muted-foreground)',
  'ui-background': 'var(--egen-colors-surface-background)',
  'color-gray-30': 'var(--egen-colors-neutral-300)',
  'color-gray-70': 'var(--egen-colors-neutral-600)',
  'color-gray-100': 'var(--egen-colors-neutral-900)',
  'color-blue-60-2': 'var(--egen-colors-primary-600)',
  'color-blue-10': 'var(--egen-colors-primary-50)',
  'color-yellow-50': 'var(--egen-colors-warning-200)',
  'carbon--red-50': 'var(--egen-colors-error-400)',
  'inverse-link': 'var(--egen-colors-primary-300)',
  'support-02': 'var(--egen-colors-success-500)',
  'inverse-support-03': 'var(--egen-colors-warning-400)',
  'warning-background': 'var(--egen-colors-warning-50)',
  'egen-background-grey': 'var(--egen-colors-surface-muted)',
  'danger': 'var(--egen-colors-error-500)',
  'interactive-01': 'var(--egen-colors-primary-600)',
  'field-01': 'var(--egen-colors-surface-muted)',
  'grey-2': 'var(--egen-colors-border-default)',
  'labeldropdown': 'var(--egen-colors-neutral-300)',
  'brand-primary-10': 'var(--egen-colors-primary-50)',
  'brand-primary-20': 'var(--egen-colors-primary-100)',
  'brand-primary-30': 'var(--egen-colors-primary-200)',
  'brand-primary-40': 'var(--egen-colors-primary-300)',
  'brand-primary-50': 'var(--egen-colors-primary-400)',
  'brand-primary-90': 'var(--egen-colors-primary-800)',
  'brand-primary-100': 'var(--egen-colors-primary-900)',
};
const BRAND = { '01': 'primary-600', '02': 'primary-700', '03': 'primary-500' };

const args = process.argv.slice(2);
const root = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const write = args.includes('--write');
const SKIP_DIR = new Set(['node_modules', 'dist', 'lib', '.tmp', '.turbo', '.git', 'coverage', 'storybook-static']);
const SKIP_FILE = /(^|\/)(CHANGELOG\.md|yarn\.lock)$|^scripts\/|^docs\//;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(scss|css|tsx|ts|js|mjs)$/.test(name) && !SKIP_FILE.test(relative(root, full).replaceAll('\\', '/'))) yield full;
  }
}

// `$ui-01` ou `vars.$ui-01` (@use 'vars' avec espace de noms)
const aliasRe = new RegExp('(?:[A-Za-z0-9_-]+\\.)?\\$(' + Object.keys(ALIASES).sort((a, b) => b.length - a.length).join('|') + ')(?![\\w-])', 'g');
const report = { files: 0, aliases: 0, brand: 0, fallbacks: 0 };

for (const file of walk(root)) {
  let text = readFileSync(file, 'utf8');
  const before = text;
  const isScss = file.endsWith('.scss');
  // Les lignes `@forward … hide $alias` et les commentaires ne sont jamais réécrits (garde-fou volontaire du styleguide).
  const keep = (line) => /^\s*(@forward\b|\/\/)/.test(line);
  if (isScss && !file.endsWith('_vars.scss'))
    text = text.split('\n').map((line) => (keep(line) ? line : line.replace(aliasRe, (_m, name) => (report.aliases++, ALIASES[name])))).join('\n');
  text = text.replace(/@include brand-0([123])\(\s*([^)]+?)\s*\);/g, (_m, n, prop) => (report.brand++, `${prop}: var(--egen-colors-${BRAND[`0${n}`]});`));
  text = text.replace(/var\(--brand-0([123])\)/g, (_m, n) => (report.brand++, `var(--egen-colors-${BRAND[`0${n}`]})`));
  text = text.replace(/var\((--egen-[a-z0-9-]+),\s*#[0-9a-fA-F]{3,8}\)/g, (_m, v) => (report.fallbacks++, `var(${v})`));
  if (text !== before) {
    report.files++;
    if (write) writeFileSync(file, text);
  }
}
console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', root: relative(process.cwd(), root) || '.', ...report }, null, 2));
