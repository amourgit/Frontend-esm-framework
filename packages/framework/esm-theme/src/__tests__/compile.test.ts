import { describe, expect, it } from 'vitest';
import { buildThemeCss, compileTheme, themeToCssVars } from '../tokiforge/compile.js';

describe('compileTheme', () => {
  it('kebab-case, préfixe egen, ignore priority/meta', () => {
    const { base } = compileTheme({
      priority: 1,
      meta: { name: 'x' },
      borderRadius: { md: '4px' },
      typography: { fontFamily: { sans: ['Inter', 'sans-serif'] } },
    }).vars;
    expect(base).toEqual({
      '--egen-border-radius-md': '4px',
      '--egen-typography-font-family-sans': 'Inter, sans-serif',
    });
  });
  it('light/dark : nœuds par mode séparés du commun', () => {
    const v = themeToCssVars({
      colors: { primary: { '500': '#111' }, surface: { light: { background: '#fff' }, dark: { background: '#000' } } },
    });
    expect(v.base).toEqual({ '--egen-colors-primary-500': '#111' });
    expect(v.light).toEqual({ '--egen-colors-surface-background': '#fff' });
    expect(v.dark).toEqual({ '--egen-colors-surface-background': '#000' });
  });
  it('types de feuilles : nombre, booléen, null', () => {
    expect(themeToCssVars({ z: { modal: 50 }, flag: true, reset: null }).base).toEqual({
      '--egen-z-modal': '50',
      '--egen-flag': 'true',
      '--egen-reset': 'initial',
    });
  });
  it('rejette sans lever : valeur non sûre et clé réservée', () => {
    const c = compileTheme({ ok: '1px', bad: 'a; b', spacing: { value: '4px' } });
    expect(c.vars.base).toEqual({ '--egen-ok': '1px' });
    expect(c.rejected).toHaveLength(2);
  });
  it('composants : variante et état', () => {
    const v = themeToCssVars({
      components: { button: { primary: { hover: { background: { light: '#a', dark: '#b' } } } } },
    });
    expect(v.light['--egen-components-button-primary-hover-background']).toBe('#a');
    expect(v.dark['--egen-components-button-primary-hover-background']).toBe('#b');
  });
});

describe('buildThemeCss (TokenExporter)', () => {
  it('3 blocs : base, light, dark, avec le sélecteur demandé', () => {
    const css = buildThemeCss(
      compileTheme({ a: '1', c: { light: { x: '2' }, dark: { x: '3' } } }),
      '[data-egen-app="demo"]',
    );
    expect(css).toContain('[data-egen-app="demo"] {\n  --egen-a: 1;');
    expect(css).toContain('[data-egen-app="demo"][data-theme=\'light\']');
    expect(css).toContain('--egen-c-x: 3;');
  });
  it('refuse un sélecteur dangereux (garde TokiForge)', () => {
    expect(() => buildThemeCss(compileTheme({ a: '1' }), ':root{}')).toThrow();
  });
  it('document vide → CSS vide', () => {
    expect(buildThemeCss(compileTheme({ priority: 1 }))).toBe('');
  });
});
