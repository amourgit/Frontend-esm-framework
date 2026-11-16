#!/usr/bin/env node
// Régénère la liste blanche « Carbon / SCSS restant » (packages/framework/esm-styleguide/carbon-scss-allowlist.json).
// À lancer après avoir migré des fichiers : la liste ne fait que rétrécir (voir zero-carbon.architecture.test.ts).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['packages/framework', 'packages/shell', 'packages/tooling'];
const SKIP = new Set(['node_modules', 'dist', 'coverage', 'storybook-static', '.turbo']);
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|scss)$/;
// Import Carbon, ou couplage caché par classe CSS Carbon (`cds--…`, `cds-…`).
const CARBON =
  /(from\s+['"]|import\s+['"]|@use\s+['"]|@forward\s+['"]|@import\s+['"]|require\(\s*['"])@carbon\/|\bcds-{1,2}[a-z]/;
const SELF = 'packages/framework/esm-styleguide/src/zero-carbon.architecture.test.ts';

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (SOURCE.test(name)) {
      const rel = relative(ROOT, full).split('\\').join('/');
      if (rel !== SELF && (rel.endsWith('.scss') || CARBON.test(readFileSync(full, 'utf-8')))) files.push(rel);
    }
  }
};
DIRS.forEach((d) => walk(join(ROOT, d)));
files.sort();
const out = join(ROOT, 'packages/framework/esm-styleguide/carbon-scss-allowlist.json');
writeFileSync(
  out,
  JSON.stringify({ _note: 'Fichiers qui contiennent encore Carbon ou SCSS. Cette liste ne fait que rétrécir (voir zero-carbon.architecture.test.ts).', files }, null, 2) + '\n',
);
console.log(`${files.length} fichier(s) restant(s)`);
