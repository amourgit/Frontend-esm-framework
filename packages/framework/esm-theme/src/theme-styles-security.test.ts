import { describe, expect, it, beforeEach } from 'vitest';
import presets from './__fixtures__/tweakcn-presets.json';
import {
  assertSafeThemeProps,
  defaultThemeStyles,
  isSafeThemeKey,
  themeStylesToCss,
  themeValueProblem,
  validateThemeStyles,
  type ThemeStyles,
} from './theme-styles.js';
import { ThemeStylesRuntime } from './theme-styles-runtime.js';

const withLight = (patch: Record<string, string>): ThemeStyles => ({ light: { ...defaultThemeStyles.light, ...patch }, dark: defaultThemeStyles.dark });

const PAYLOADS: Array<[string, string, string]> = [
  ['sortie de règle (couleur)', 'primary', 'red; } body { display:none } :root {'],
  ['@import distant (couleur)', 'primary', 'red; } @import url(https://evil.example/x.css); :root {'],
  ['url() dans une dimension', 'radius', '1px; background: url(https://evil.example/t.gif)'],
  ['sortie de règle (police)', 'font-sans', 'x; } body { display:none } .a {'],
  ['url() dans une police', 'font-mono', 'monospace, url(https://evil.example/f)'],
  ['commentaire CSS', 'spacing', '1rem /* x */'],
  ['balise de fermeture', 'shadow-color', '</style><script>alert(1)</script>'],
  ['accolade seule', 'ring', '{'],
  ['retour à la ligne', 'border', 'red\n}'],
  ['échappement', 'input', 'red\\;'],
  ['expression()', 'accent', 'expression(alert(1))'],
  ['javascript:', 'card', 'javascript:alert(1)'],
  ['couleur non reconnue', 'primary', 'pas-une-couleur'],
  ['fonction de couleur inconnue', 'primary', 'var(--x)'],
  ['opacité hors plage', 'shadow-opacity', '2'],
  ['dimension non numérique', 'radius', 'calc(1px + 2px)'],
  ['valeur géante', 'font-sans', 'a'.repeat(600)],
  ['valeur non textuelle', 'radius', 42 as unknown as string],
];

describe('sécurité : aucune valeur ne peut sortir de sa déclaration CSS', () => {
  for (const [label, key, value] of PAYLOADS) {
    it(`refusé par la validation : ${label}`, () => {
      const r = validateThemeStyles(withLight({ [key]: value }));
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.startsWith(`light.${key} :`) || e.startsWith(`light.${key} `))).toBe(true);
    });
    it(`refusé au puits CSS (même si la validation était contournée) : ${label}`, () => {
      expect(() => themeStylesToCss(withLight({ [key]: value }))).toThrow(new RegExp(`light\\.${key}`));
    });
  }

  it('noms de clés : seuls [a-z][a-z0-9-]* sont admis', () => {
    for (const bad of ['Primary', 'a b', 'x;y', 'x}', '1abc', '', 'a'.repeat(80), 'x:y', '--x']) expect(isSafeThemeKey(bad)).toBe(false);
    for (const ok of ['primary', 'chart-1', 'sidebar-primary-foreground', 'brand-accent']) expect(isSafeThemeKey(ok)).toBe(true);
    const r = validateThemeStyles({ light: { ...defaultThemeStyles.light, 'x;}body{': 'red' }, dark: defaultThemeStyles.dark });
    expect(r.valid).toBe(false);
  });

  it('clés inconnues (extensions futures) : admises seulement avec une valeur sûre', () => {
    expect(validateThemeStyles(withLight({ 'brand-accent': 'oklch(0.7 0.1 200)' })).valid).toBe(true);
    expect(validateThemeStyles(withLight({ 'brand-accent': 'red; } body{x:y' })).valid).toBe(false);
    expect(themeValueProblem('brand-accent', 'url(x)')).not.toBeNull();
  });

  it('assertSafeThemeProps ne reproche rien aux valeurs légitimes', () => {
    expect(() => assertSafeThemeProps({ primary: '#3b82f6', 'font-sans': '"Inter", ui-sans-serif, sans-serif', radius: '0.5rem', 'letter-spacing': '-0.025em', 'shadow-opacity': '0.18' }, 'light')).not.toThrow();
  });
});

describe('sécurité : le runtime refuse avant toute écriture dans le DOM', () => {
  let rt: ThemeStylesRuntime;
  beforeEach(() => {
    document.head.innerHTML = '';
    rt = new ThemeStylesRuntime();
  });

  it('apply : thème piégé refusé, aucun <style> créé', () => {
    expect(() => rt.apply(withLight({ primary: 'red; } body{display:none} :root{' }))).toThrow(/light\.primary/);
    expect(document.head.children).toHaveLength(0);
    expect(rt.getStyles()).toBeNull();
  });

  it('setOverride : valeur, clé et scope piégés refusés, rien d\'écrit', () => {
    expect(() => rt.setOverride('x', { light: { primary: 'red; } a{' } })).toThrow();
    expect(() => rt.setOverride('x', { light: { 'a;}b{': 'red' } })).toThrow(/nom de clé/);
    expect(() => rt.setOverride('x', { light: { primary: 'red' } }, { scope: 'body{display:none}' })).toThrow(/scope/);
    expect(document.head.children).toHaveLength(0);
    expect(rt.listOverrides()).toEqual([]);
  });

  it('une surcharge légitime avec un scope CSS usuel passe', () => {
    expect(() => rt.setOverride('ok', { light: { primary: 'hotpink' } }, { scope: '[data-app="annuaire"] .panel > div' })).not.toThrow();
  });
});

describe('compatibilité : les 42 thèmes prédéfinis de Tweakcn restent valides, sans avertissement', () => {
  const entries = Object.entries(presets as unknown as Record<string, ThemeStyles>);
  it('corpus complet', () => {
    expect(entries.length).toBe(42);
  });
  for (const [name, styles] of entries) {
    it(`${name}`, () => {
      const r = validateThemeStyles(styles);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
      expect(() => themeStylesToCss(styles)).not.toThrow();
    });
  }
});
