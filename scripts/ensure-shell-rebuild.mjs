#!/usr/bin/env node
// Le shell (`@egen-civitas/esm-app-shell`) COMPILE dans son bundle les paquets du framework qu'il importe, puis les
// partage aux apps (Module Federation, singletons). Un bundle est une photo du code au moment du build : dès qu'un de
// ces paquets change, le shell doit être reconstruit et republié, sinon les apps exécutent l'ancienne version.
//
// Ce script supprime l'oubli : avant `changeset version`, si un changeset en attente touche un paquet embarqué par le
// shell sans toucher le shell, il ajoute lui-même un changeset `patch` pour le shell.
//
//   node scripts/ensure-shell-rebuild.mjs          -> écrit le changeset manquant
//   node scripts/ensure-shell-rebuild.mjs --check  -> n'écrit rien, échoue s'il manque
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SHELL_DIR = 'packages/shell/esm-app-shell';
export const AUTO_CHANGESET = 'auto-shell-rebuild.md';

/** Noms de paquets cités dans l'en-tête d'un changeset (`'nom': patch|minor|major`). */
export function packagesOf(changesetText) {
  const m = changesetText.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return [];
  return [...m[1].matchAll(/^\s*['"]?([^'":\s][^'":]*?)['"]?\s*:\s*(?:patch|minor|major)\s*$/gm)].map((x) => x[1]);
}

/** Paquets du framework que le shell embarque : ses dépendances `@egen-civitas/*` (hors lui-même). */
export function bundledBy(shellPkg) {
  const deps = { ...shellPkg.dependencies, ...shellPkg.devDependencies };
  return Object.keys(deps).filter((n) => n.startsWith('@egen-civitas/') && n !== shellPkg.name);
}

/** Texte du changeset à ajouter, ou null si le shell est déjà couvert / non concerné. */
export function missingShellChangeset({ shellName, bundled, changesets }) {
  const touched = new Set(changesets.flatMap(packagesOf));
  if (touched.has(shellName)) return null;
  const causes = bundled.filter((n) => touched.has(n)).sort();
  if (causes.length === 0) return null;
  return `---\n'${shellName}': patch\n---\n\nReconstruit automatiquement : le shell embarque dans son bundle ${causes
    .map((n) => `\`${n}\``)
    .join(
      ', ',
    )}, modifiés dans cette version. Sans cette republication, les apps continueraient d'exécuter l'ancienne copie.\n`;
}

function main() {
  const root = resolve(fileURLToPath(import.meta.url), '..', '..');
  const dir = join(root, '.changeset');
  const shellPkg = JSON.parse(readFileSync(join(root, SHELL_DIR, 'package.json'), 'utf8'));
  const changesets = readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== AUTO_CHANGESET)
    .map((f) => readFileSync(join(dir, f), 'utf8'));
  const text = missingShellChangeset({ shellName: shellPkg.name, bundled: bundledBy(shellPkg), changesets });
  if (!text) return console.log('[shell-rebuild] rien à ajouter.');
  if (process.argv.includes('--check')) {
    console.error(`[shell-rebuild] changeset manquant pour ${shellPkg.name} :\n${text}`);
    process.exit(1);
  }
  writeFileSync(join(dir, AUTO_CHANGESET), text);
  console.log(`[shell-rebuild] ajouté .changeset/${AUTO_CHANGESET}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
