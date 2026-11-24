import { describe, it, expect } from 'vitest';
import golden from './__fixtures__/tweakcn-golden.json';
import {
  THEME_COLOR_KEYS,
  buildShadowMap,
  canonicalizeThemeStyles,
  defaultThemeStyles,
  diffThemeStyles,
  formatColor,
  themeContrastReport,
  themeStylesToCss,
  themeStylesToCssBlock,
  validateThemeStyles,
  type ThemeStyles,
} from './theme-styles.js';

type Golden = {
  name: string;
  styles: ThemeStyles;
  hsl4: { light: string; dark: string };
  oklch4: { light: string; dark: string };
};
const themes = golden as unknown as Golden[];

describe('compatibilité Tweakcn (référence = générateur réel de Tweakcn)', () => {
  it('couvre le thème par défaut et 8 thèmes prédéfinis', () => {
    expect(themes.length).toBe(9);
  });

  for (const t of themes) {
    it(`${t.name} : blocs :root/.dark identiques en hsl`, () => {
      expect(themeStylesToCssBlock(t.styles, 'light', { colorFormat: 'hsl' })).toBe(t.hsl4.light);
      expect(themeStylesToCssBlock(t.styles, 'dark', { colorFormat: 'hsl' })).toBe(t.hsl4.dark);
    });
    it(`${t.name} : blocs :root/.dark identiques en oklch`, () => {
      expect(themeStylesToCssBlock(t.styles, 'light', { colorFormat: 'oklch' })).toBe(t.oklch4.light);
      expect(themeStylesToCssBlock(t.styles, 'dark', { colorFormat: 'oklch' })).toBe(t.oklch4.dark);
    });
    it(`${t.name} : en mode raw, seules les couleurs diffèrent et elles gardent la valeur enregistrée`, () => {
      const raw = themeStylesToCssBlock(t.styles, 'light', { colorFormat: 'raw' }).split('\n');
      const ref = t.oklch4.light.split('\n');
      expect(raw.length).toBe(ref.length);
      const colorNames = new Set<string>([...THEME_COLOR_KEYS]);
      raw.forEach((line, i) => {
        const m = line.match(/^ {2}--([a-z0-9-]+): (.*);$/);
        if (m && colorNames.has(m[1])) expect(m[2]).toBe(t.styles.light[m[1]]);
        else expect(line).toBe(ref[i]);
      });
    });
  }

  it('themeStylesToCss assemble :root puis .dark', () => {
    const t = themes[0];
    expect(themeStylesToCss(t.styles, { colorFormat: 'hsl' })).toBe(`${t.hsl4.light}\n\n${t.hsl4.dark}`);
  });
});

describe('validateThemeStyles', () => {
  it('accepte le thème par défaut sans erreur ni avertissement', () => {
    const r = validateThemeStyles(defaultThemeStyles);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.valid).toBe(true);
  });
  it('rejette un non-objet et un mode manquant', () => {
    expect(validateThemeStyles(null).valid).toBe(false);
    expect(validateThemeStyles([]).valid).toBe(false);
    const r = validateThemeStyles({ light: defaultThemeStyles.light });
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('dark');
  });
  it('signale une clé obligatoire manquante ou vide', () => {
    const light = { ...defaultThemeStyles.light } as Record<string, string>;
    delete light.primary;
    light.radius = '  ';
    const r = validateThemeStyles({ light, dark: defaultThemeStyles.dark });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('light.primary est obligatoire (chaîne non vide)');
    expect(r.errors).toContain('light.radius est obligatoire (chaîne non vide)');
  });
  it("tolère l'évolution du format : clés inconnues = avertissements, pas erreurs", () => {
    const r = validateThemeStyles({
      light: { ...defaultThemeStyles.light, 'brand-accent': 'oklch(0.7 0.1 200)' },
      dark: defaultThemeStyles.dark,
      meta: { version: 2 },
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('light.brand-accent'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('"meta"'))).toBe(true);
  });
  it('refuse une couleur illisible (les valeurs sont écrites dans du CSS)', () => {
    const r = validateThemeStyles({
      light: { ...defaultThemeStyles.light, primary: 'pas-une-couleur' },
      dark: defaultThemeStyles.dark,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('light.primary'))).toBe(true);
  });
});

describe('contrastes', () => {
  it('le thème par défaut respecte AA sur background/foreground', () => {
    const e = themeContrastReport(defaultThemeStyles).find((x) => x.mode === 'light' && x.background === 'background');
    expect(e?.ratio).toBeGreaterThan(15);
    expect(e?.passesAAA).toBe(true);
  });
  it('détecte un contraste insuffisant', () => {
    const bad = {
      light: { ...defaultThemeStyles.light, primary: '#777777', 'primary-foreground': '#888888' },
      dark: defaultThemeStyles.dark,
    };
    const e = themeContrastReport(bad).find((x) => x.mode === 'light' && x.background === 'primary');
    expect(e?.passesAA).toBe(false);
  });
});

describe('outils', () => {
  it('forme canonique indépendante de l\'ordre des clés', () => {
    const a: ThemeStyles = { light: { b: '1', a: '2' }, dark: { y: '1', x: '2' } };
    const b: ThemeStyles = { light: { a: '2', b: '1' }, dark: { x: '2', y: '1' } };
    expect(canonicalizeThemeStyles(a)).toBe(canonicalizeThemeStyles(b));
  });
  it('diff : ajouts, retraits, changements', () => {
    const a: ThemeStyles = { light: { p: '1', q: '2' }, dark: { p: '1' } };
    const b: ThemeStyles = { light: { p: '9', r: '3' }, dark: { p: '1' } };
    const d = diffThemeStyles(a, b);
    expect(d.added).toEqual(['light.r']);
    expect(d.removed).toEqual(['light.q']);
    expect(d.changed).toEqual([{ path: 'light.p', from: '1', to: '9' }]);
    expect(d.identical).toBe(false);
    expect(diffThemeStyles(a, a).identical).toBe(true);
  });
  it('formatColor : valeur illisible renvoyée telle quelle', () => {
    expect(formatColor('n/a', 'hsl')).toBe('n/a');
    expect(formatColor('#ffffff', 'hex')).toBe('#ffffff');
  });
  it('8 ombres dérivées', () => {
    expect(Object.keys(buildShadowMap(defaultThemeStyles.light))).toHaveLength(8);
  });
});
