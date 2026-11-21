import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// =============================================================================
//  GARDE-FOU « ZÉRO CARBON / ZÉRO SCSS »
//
//  Carbon (`@carbon/*`) et SCSS ont été retirés du framework (voir docs/PLAN-RETRAIT-CARBON-SCSS.md) : Tailwind est le seul
//  système de style, les composants de base vivent dans `src/ui`. Ce test échoue dès qu'un fichier source ou un
//  `package.json` réintroduit :
//    • un fichier `.scss` ou `.sass` ;
//    • une mention de `@carbon/` ou `carbon-components` ;
//    • une classe CSS Carbon (`cds--…`, `cds-…`) ;
//    • une dépendance `sass`, `sass-loader` ou `sass-embedded`.
// =============================================================================

const ROOT = join(process.cwd(), '..', '..', '..');
const SOURCE_DIRS = ['packages/framework', 'packages/shell', 'packages/tooling'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'storybook-static', '.turbo']);
const SKIP_FILES = new Set(['CHANGELOG.md', 'zero-carbon.architecture.test.ts']);
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|css|ejs|json)$/;
const CARBON = /@carbon\/|carbon-components|\bcds-{1,2}[a-z]/;
const SASS_DEPENDENCY = /"(sass|sass-loader|sass-embedded|@rsbuild\/plugin-sass)"\s*:/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir)))
  .filter((file) => !SKIP_FILES.has(file.split(/[\\/]/).pop() ?? ''))
  .map((file) => ({ file, rel: relative(ROOT, file).split('\\').join('/') }));

// Le parcours de tout le dépôt peut dépasser les 5 s par défaut quand la machine est chargée (tests en parallèle) : 60 s.
describe('zéro Carbon / zéro SCSS', { timeout: 60_000 }, () => {
  it("aucun fichier .scss ou .sass n'existe", () => {
    expect(files.filter(({ rel }) => /\.(scss|sass)$/.test(rel)).map(({ rel }) => rel)).toEqual([]);
  });

  it("aucune source ne mentionne Carbon (`@carbon/`, `cds--` …)", () => {
    const offenders = files
      .filter(({ rel }) => SOURCE_FILE.test(rel) && !rel.endsWith('.snap'))
      .filter(({ file }) => CARBON.test(readFileSync(file, 'utf-8')))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it("aucun package.json ne déclare sass ni Carbon", () => {
    const offenders = files
      .filter(({ rel }) => rel.endsWith('package.json'))
      .filter(({ file }) => {
        const text = readFileSync(file, 'utf-8');
        return SASS_DEPENDENCY.test(text) || CARBON.test(text);
      })
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
