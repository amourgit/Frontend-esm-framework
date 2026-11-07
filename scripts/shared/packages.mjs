import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CATEGORIES = ['framework', 'shell', 'tooling'];

/**
 * Paquets publiés qui ne sont PAS des librairies importables : aucun point d'entrée JS (`main`/`exports`)
 * volontairement. Les vérifications qui supposent une librairie (import réel, résolution des types) les ignorent.
 *
 * `esm-app-shell` : bundle applicatif navigateur (sortie rspack aux noms hashés), servi tel quel par le CLI egen,
 * et qui publie aussi ses sources de construction (`rspack.config.js`, `src/`, `tools/`) pour `egen build`.
 * Ces sources `.ts` font croire à attw qu'il s'agit d'un paquet typé dont l'import racine devrait se résoudre.
 */
export const NOT_A_LIBRARY = new Set(['@egen-civitas/esm-app-shell']);

/**
 * Énumère tous les packages publiables du monorepo (private !== true),
 * dans packages/{framework,shell,tooling}/*.
 *
 * @param {string} rootDir racine du dépôt (contenant le dossier packages/)
 * @returns {{ dir: string, name: string, version: string, pkg: object }[]}
 */
export function listPublishablePackages(rootDir) {
  const result = [];
  for (const category of CATEGORIES) {
    const categoryDir = join(rootDir, 'packages', category);
    let entries;
    try {
      entries = readdirSync(categoryDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const dir = join(categoryDir, entry);
      const pkgJsonPath = join(dir, 'package.json');
      try {
        if (!statSync(pkgJsonPath).isFile()) continue;
      } catch {
        continue;
      }
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.private) continue;
      result.push({ dir, name: pkg.name, version: pkg.version, pkg });
    }
  }
  return result;
}
