import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CATEGORIES = ['framework', 'shell', 'tooling'];

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
