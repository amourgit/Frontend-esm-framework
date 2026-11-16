import { describe, expect, it } from 'vitest';
import { checkCssValue } from '../model/css-safety.js';
import { deepMerge, mergeByPriority } from '../model/merge.js';
import { componentCascade, componentVar, componentVarName } from '../model/components.js';
import { validateThemeDocument, validateThemeOverride } from '../model/validate.js';
import { themeToCssVars } from '../tokiforge/compile.js';

describe('validateThemeDocument', () => {
  it('accepte un thème correct et exige priority', () => {
    expect(validateThemeDocument({ priority: 1, colors: { primary: { '500': '#fff' } } })).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(validateThemeDocument({ colors: {} }).valid).toBe(false);
    expect(validateThemeDocument({ priority: Infinity }).valid).toBe(false);
    expect(validateThemeDocument([]).valid).toBe(false);
  });
  it('la surcharge n’exige pas priority', () => {
    expect(validateThemeOverride({ colors: { primary: { '500': '#fff' } } }).valid).toBe(true);
  });
  it('signale les valeurs non sûres en avertissement (thème utilisable, feuille ignorée)', () => {
    const r = validateThemeDocument({ priority: 1, radius: 'red; } body { x: y', ok: '1px' });
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([expect.stringContaining('radius')]);
  });
  it('refuse la clé réservée « value » (ambiguïté TokiForge)', () => {
    const r = validateThemeDocument({ priority: 1, spacing: { value: '4px' } });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('value');
  });
  it('limite profondeur et taille', () => {
    expect(validateThemeDocument({ priority: 1, a: 'x'.repeat(4001) }).valid).toBe(false);
  });
});

describe('checkCssValue', () => {
  it.each(['#fff', '0 1px 2px rgba(0,0,0,.1)', 'url(/img/a.png)', 'url("https://x.io/a.png")', 'var(--egen-a, 1px)'])(
    'accepte %s',
    (v) => expect(checkCssValue(v).ok).toBe(true),
  );
  it.each(['red;', '}', 'a{b}', '/* x */', '<script>', 'url(http://x.io/a)', 'url(//evil.io/a)', 'x'.repeat(1001)])(
    'refuse %s',
    (v) => expect(checkCssValue(v).ok).toBe(false),
  );
});

describe('fusion', () => {
  it('deepMerge : profonde, tableaux remplacés, immutable', () => {
    const base = { a: { b: 1, c: [1, 2] }, d: 1 };
    const out = deepMerge(base, { a: { c: [3] }, e: 2, d: undefined });
    expect(out).toEqual({ a: { b: 1, c: [3] }, d: 1, e: 2 });
    expect(base.a.c).toEqual([1, 2]);
  });
  it('mergeByPriority : la plus haute gagne, ordre indépendant du tableau', () => {
    const out = mergeByPriority({}, [
      { priority: 10, document: { x: '10' } },
      { priority: 1, document: { x: '1', y: '1' } },
    ]);
    expect(out).toEqual({ x: '10', y: '1' });
  });
});

describe('composants : nommage et cascade', () => {
  it('nom de variable : kebab-case, préfixe egen, base/default par défaut', () => {
    expect(componentVarName('button', 'primary', 'hover', 'borderColor')).toBe(
      '--egen-components-button-primary-hover-border-color',
    );
    expect(componentVarName('card', '', '', 'radius')).toBe('--egen-components-card-base-default-radius');
  });
  it('cascade : variante/état → variante/default → base/état → base/default, sans doublon', () => {
    expect(
      componentCascade('button', 'primary', 'hover', 'radius').map((n) => n.replace('--egen-components-button-', '')),
    ).toEqual(['primary-hover-radius', 'primary-default-radius', 'base-hover-radius', 'base-default-radius']);
    expect(componentCascade('card', 'base', 'default', 'radius')).toHaveLength(1);
  });
  it('componentVar imbrique les var() jusqu’au repli', () => {
    const v = componentVar('button', 'primary', 'hover', 'radius', 'var(--egen-border-radius-md)');
    expect(
      v.startsWith(
        'var(--egen-components-button-primary-hover-radius, var(--egen-components-button-primary-default-radius,',
      ),
    ).toBe(true);
    expect(v.endsWith('var(--egen-border-radius-md)))))')).toBe(true);
  });
  it('la variable produite par le thème est bien celle que la cascade consulte', () => {
    const vars = themeToCssVars({
      components: { button: { primary: { hover: { background: { light: '#a', dark: '#b' } } } } },
    });
    expect(Object.keys(vars.light)).toContain(componentVarName('button', 'primary', 'hover', 'background'));
  });
});
