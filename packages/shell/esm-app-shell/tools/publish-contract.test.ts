// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrat de publication : `egen build` (chez le consommateur) charge `rspack.config.js` depuis le paquet
 * npm installé et reconstruit le shell depuis ses sources. Tout fichier lu par ce config doit donc être
 * publié. Dans le monorepo, un fichier manquant « marche quand même » (les sources sont sur le disque) :
 * seul un test sur le contenu du tarball le détecte. Voir docs/baseline-2026-11.md (tâche A3).
 */
function packedFiles(pkgDir: string): string[] {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: pkgDir,
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  const [report] = JSON.parse(result.stdout);
  return report.files.map((f: { path: string }) => f.path);
}

// `npm pack --dry-run` est synchrone et dépasse régulièrement les 5 s par défaut de vitest sur un runner chargé
// (vu en CI et en local) : ces tests mesurent le contenu d'un tarball, pas la vitesse de npm.
const PACK_TIMEOUT_MS = 60_000;

const frameworkDir = (name: string) => resolve(__dirname, '../../../framework', name);

describe('contrat de publication du shell (reconstruction par le consommateur)', () => {
  const shellFiles = packedFiles(resolve(__dirname, '..'));

  it.each([
    'rspack.config.js',
    'dependencies.json',
    'src/index.ts',
    'src/index.ejs',
    'src/run.ts',
    'tools/brand.js',
    'tools/helpers.js',
    'src/assets/favicon.ico',
  ])('publie %s', (file) => {
    expect(shellFiles).toContain(file);
  });

  it('publie toujours le dist précompilé (servi tel quel par egen develop/start)', () => {
    expect(shellFiles.some((f) => f === 'dist/index.html')).toBe(true);
  });

  it('ne publie aucun fichier de test', () => {
    expect(shellFiles.filter((f) => /\.test\.[jt]sx?$/.test(f))).toEqual([]);
  });

  it(
    'esm-theme publie le thème par défaut copié dans chaque build',
    () => {
      expect(packedFiles(frameworkDir('esm-theme'))).toContain('src/themes/theme.default.json');
    },
    PACK_TIMEOUT_MS,
  );

  it(
    'esm-translations publie les fichiers de langue importés par le shell',
    () => {
      expect(packedFiles(frameworkDir('esm-translations'))).toContain('translations/en.json');
    },
    PACK_TIMEOUT_MS,
  );
});
