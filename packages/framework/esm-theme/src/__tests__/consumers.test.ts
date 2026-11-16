import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Garde-fou « un seul système » (ADR-006, §27 du cahier des charges) : plus aucun consommateur du dépôt ne doit utiliser l'ancien nommage des
// variables du thème ni les API de l'ancien moteur. Rejouer `node scripts/migrate-theme-vars.mjs . --write` en cas d'écart.

const root = join(__dirname, '../../../../..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', 'storybook-static']);
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|scss|css|json|md|ejs|html)$/;
const SKIP_FILE = /CHANGELOG\.md$|__tests__\/golden\/|__tests__\/(consumers|golden)\.test\.ts$/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT.test(name) && !SKIP_FILE.test(full.replaceAll('\\', '/'))) yield full;
  }
}

/** Fichiers suivis par git (les sorties de build générées ne comptent pas) ; repli sur le parcours du disque sans git. */
function trackedFiles(): string[] {
  try {
    const out = execFileSync('git', ['ls-files', '-z', 'packages'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split('\0')
      .filter(Boolean)
      .map((f) => join(root, f))
      .filter((f) => TEXT.test(f) && !SKIP_FILE.test(f.replaceAll('\\', '/')) && existsSync(f));
  } catch {
    return [...walk(join(root, 'packages'))];
  }
}

const files = trackedFiles();
const offenders = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));

describe('un seul système de thème', () => {
  it('aucune variable du thème sans le préfixe --egen-', async () => {
    const { FAMILY_PREFIX_RE } = (await import('../../../../../scripts/lib/theme-vars.mjs')) as {
      FAMILY_PREFIX_RE: RegExp;
    };
    expect(offenders(new RegExp(FAMILY_PREFIX_RE.source))).toEqual([]);
  });

  it("aucun usage des API de l'ancien moteur", () => {
    const removed = [
      'flattenToCssVars',
      'injectScopedCssVars',
      'injectCssVarsToDocument',
      'buildThemeCssText',
      'loadHighestPriorityTheme',
      'validateThemeSchema',
      'mergeBySortedPriority',
      'ThemeSchema',
      'AppThemeOverride',
    ];
    expect(offenders(new RegExp(`\\b(${removed.join('|')})\\b`))).toEqual([]);
  });

  it('plus aucune couche d’alias historique, couleur de marque codée en dur ni repli hexadécimal', () => {
    expect(offenders(/@include brand-0[123]|--brand-0[123]|setupBranding|Brand color #|FALLBACK_THEME/)).toEqual([]);
    expect(offenders(/var\(--egen-[a-z0-9-]+,\s*#[0-9a-fA-F]{3,8}\)/)).toEqual([]);
    expect(
      offenders(/(?<![\w-])\$(ui-0[1-5]|text-0[23]|ui-background|interactive-01|brand-primary-\d+)(?![\w-])/),
    ).toEqual([]);
  });

  it('les thèmes publiés restent valides', async () => {
    const { validateThemeDocument } = await import('../model/validate.js');
    for (const f of files.filter((p) => p.includes(join('esm-theme', 'src', 'themes')) && p.endsWith('.json'))) {
      expect(validateThemeDocument(JSON.parse(readFileSync(f, 'utf8'))), relative(root, f)).toMatchObject({
        valid: true,
        warnings: [],
      });
    }
  });
});
