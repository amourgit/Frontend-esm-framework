import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// =============================================================================
//  GARDE-FOU « ZÉRO CARBON / ZÉRO SCSS »
//
//  Chantier : retirer complètement Carbon (`@carbon/*`) et SCSS (voir docs/PLAN-RETRAIT-CARBON-SCSS.md). Cette liste blanche
//  (`carbon-scss-allowlist.json`) recense les fichiers qui en contiennent ENCORE. Elle ne peut que rétrécir :
//    • un fichier hors liste qui importe Carbon ou qui est un `.scss` fait échouer le test (rien de nouveau ne s'ajoute) ;
//    • un fichier de la liste qui n'en contient plus doit être retiré de la liste (le progrès est verrouillé).
//  Quand la liste est vide, le test devient « zéro Carbon / zéro SCSS » pour de bon et le fichier JSON peut être supprimé.
// =============================================================================

const ROOT = join(process.cwd(), '..', '..', '..');
const SOURCE_DIRS = ['packages/framework', 'packages/shell', 'packages/tooling'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'storybook-static', '.turbo']);
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|scss)$/;
const CARBON_IMPORT = /(from\s+['"]|import\s+['"]|@use\s+['"]|@forward\s+['"]|@import\s+['"]|require\(\s*['"])@carbon\//;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, out);
    else if (SOURCE_FILE.test(name)) out.push(full);
  }
  return out;
}

const SELF = 'packages/framework/esm-styleguide/src/zero-carbon.architecture.test.ts';

function offenders(): string[] {
  const found: string[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, file).split('\\').join('/');
      if (rel === SELF) continue;
      if (rel.endsWith('.scss') || CARBON_IMPORT.test(readFileSync(file, 'utf-8'))) found.push(rel);
    }
  }
  return found.sort();
}

describe('zéro Carbon / zéro SCSS (liste blanche décroissante)', () => {
  const allowlist: string[] = JSON.parse(
    readFileSync(join(process.cwd(), 'carbon-scss-allowlist.json'), 'utf-8'),
  ).files;
  const current = offenders();

  it("aucun nouveau fichier n'importe Carbon ni n'est un .scss", () => {
    expect(current.filter((file) => !allowlist.includes(file))).toEqual([]);
  });

  it('chaque fichier de la liste blanche en contient encore : sinon, le retirer de la liste', () => {
    expect(allowlist.filter((file) => !current.includes(file))).toEqual([]);
  });

  it('les composants de base (`src/ui`) sont propres', () => {
    expect(current.filter((file) => file.includes('esm-styleguide/src/ui/'))).toEqual([]);
  });
});
