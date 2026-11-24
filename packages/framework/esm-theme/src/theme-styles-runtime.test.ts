import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeStylesRuntime, themeKeyToVariable, type ThemeRuntimeEvent } from './theme-styles-runtime.js';
import { defaultThemeStyles } from './theme-styles.js';

const styleOf = (sel: string) => document.head.querySelector(sel)?.textContent ?? null;

describe('ThemeStylesRuntime', () => {
  let rt: ThemeStylesRuntime;
  beforeEach(() => {
    document.head.innerHTML = '';
    document.documentElement.className = '';
    rt = new ThemeStylesRuntime();
  });
  afterEach(() => rt.destroy());

  it('apply : écrit :root et .dark dans un seul <style id="egen-theme">', () => {
    rt.apply(defaultThemeStyles, 'light');
    const css = styleOf('#egen-theme')!;
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain('--primary: oklch(0.205 0 0);');
    expect(document.querySelectorAll('#egen-theme')).toHaveLength(1);
  });

  it('apply deux fois : remplace sans dupliquer', () => {
    rt.apply(defaultThemeStyles);
    rt.apply({ ...defaultThemeStyles, light: { ...defaultThemeStyles.light, primary: 'red' } });
    expect(document.querySelectorAll('#egen-theme')).toHaveLength(1);
    expect(styleOf('#egen-theme')).toContain('--primary: red;');
  });

  it('mode : la classe dark suit setMode / toggleMode', () => {
    rt.apply(defaultThemeStyles, 'dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(rt.toggleMode()).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    rt.setMode('dark');
    expect(rt.getMode()).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('surcharge globale : après la base, remplaçable par id, retirable', () => {
    rt.apply(defaultThemeStyles);
    rt.setOverride('promo', { light: { primary: 'hotpink' }, dark: { primary: 'purple' } });
    const css = styleOf('style[data-egen-override="promo"]')!;
    expect(css).toContain(':root {\n  --primary: hotpink;\n}');
    expect(css).toContain('.dark {\n  --primary: purple;\n}');
    const order = Array.from(document.head.children).map((n) => n.id || n.getAttribute('data-egen-override'));
    expect(order).toEqual(['egen-theme', 'promo']);
    rt.setOverride('promo', { light: { primary: 'gold' } });
    expect(document.querySelectorAll('style[data-egen-override="promo"]')).toHaveLength(1);
    expect(styleOf('style[data-egen-override="promo"]')).toContain('gold');
    rt.removeOverride('promo');
    expect(styleOf('style[data-egen-override="promo"]')).toBeNull();
    expect(rt.listOverrides()).toEqual([]);
  });

  it('la base reste avant les surcharges même appliquée après elles', () => {
    rt.setOverride('a', { light: { radius: '1rem' } });
    rt.apply(defaultThemeStyles);
    const order = Array.from(document.head.children).map((n) => n.id || n.getAttribute('data-egen-override'));
    expect(order).toEqual(['egen-theme', 'a']);
  });

  it('surcharge limitée à une zone (scope), mode sombre inclus', () => {
    rt.setOverride('zone', { light: { primary: 'red' }, dark: { primary: 'blue' } }, { scope: '[data-app="x"]' });
    const css = styleOf('style[data-egen-override="zone"]')!;
    expect(css).toContain('[data-app="x"] {\n  --primary: red;\n}');
    expect(css).toContain('.dark [data-app="x"] {\n  --primary: blue;\n}');
  });

  it('noms de variables : les clés brutes ont leur variable propre', () => {
    expect(themeKeyToVariable('shadow-offset-x')).toBe('shadow-x');
    expect(themeKeyToVariable('letter-spacing')).toBe('tracking-normal');
    expect(themeKeyToVariable('primary')).toBe('primary');
    rt.setOverride('s', { light: { 'shadow-offset-y': '4px' } });
    expect(styleOf('style[data-egen-override="s"]')).toContain('--shadow-y: 4px;');
  });

  it('événements : apply, mode, override', () => {
    const seen: ThemeRuntimeEvent[] = [];
    const off = rt.subscribe((e) => seen.push(e));
    rt.apply(defaultThemeStyles);
    rt.setMode('dark');
    rt.setOverride('o', { light: { ring: 'red' } });
    rt.removeOverride('o');
    off();
    rt.setMode('light');
    expect(seen.map((e) => e.type)).toEqual(['apply', 'mode', 'override', 'override']);
  });

  it('destroy : retire styles, surcharges et classe', () => {
    rt.apply(defaultThemeStyles, 'dark');
    rt.setOverride('o', { light: { ring: 'red' } });
    rt.destroy();
    expect(document.head.children).toHaveLength(0);
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('couleurs reformatées si demandé (oklch)', () => {
    const r = new ThemeStylesRuntime({ colorFormat: 'oklch' });
    r.apply({ light: { ...defaultThemeStyles.light, primary: '#3b82f6' }, dark: defaultThemeStyles.dark });
    expect(styleOf('#egen-theme')).toMatch(/--primary: oklch\(/);
    r.destroy();
  });

  it('sans DOM : ne lève pas et tient son état', () => {
    const doc = globalThis.document;
    vi.stubGlobal('document', undefined);
    const r = new ThemeStylesRuntime();
    expect(() => {
      r.apply(defaultThemeStyles, 'dark');
      r.setOverride('o', { light: { ring: 'red' } });
      r.removeOverride('o');
      r.destroy();
    }).not.toThrow();
    vi.unstubAllGlobals();
    expect(globalThis.document).toBe(doc);
  });
});
