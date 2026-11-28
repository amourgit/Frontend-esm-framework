import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_HOME_GRADIENT_COLORS,
  hexWithAlpha,
  resolveThemePalette,
  themeColorToHex,
} from './theme-palette';

/** Fait répondre `getComputedStyle(documentElement)` avec les variables données. */
function mockThemeVars(vars: Record<string, string>) {
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) => {
      // `name` arrive préfixé (`--background`) : on retire le préfixe pour la lookup.
      return vars[name.replace(/^--/, '')] ?? '';
    },
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('themeColorToHex', () => {
  it('convertit le hex en hex', () => {
    expect(themeColorToHex('#0ea5e9')).toBe('#0ea5e9');
  });

  it('convertit oklch (format Tweakcn) en hex', () => {
    expect(themeColorToHex('oklch(0.5 0.1 200)')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('convertit hsl et rgb en hex', () => {
    expect(themeColorToHex('hsl(200 50% 50%)')).toBe('#4095bf');
    expect(themeColorToHex('rgb(1 2 3)')).toBe('#010203');
  });

  it('rejette les valeurs non résolues ou invalides', () => {
    expect(themeColorToHex('')).toBeNull();
    expect(themeColorToHex(undefined)).toBeNull();
    expect(themeColorToHex('var(--primary)')).toBeNull();
    expect(themeColorToHex('pas-une-couleur')).toBeNull();
  });
});

describe('hexWithAlpha', () => {
  it('ajoute le canal alpha en hex', () => {
    expect(hexWithAlpha('#10b981', 0.5)).toBe('#10b98180');
    expect(hexWithAlpha('#10b981', 1)).toBe('#10b981ff');
    expect(hexWithAlpha('#10b981', 0)).toBe('#10b98100');
  });
});

describe('resolveThemePalette', () => {
  it('retombe sur la palette par défaut sans variables de thème', () => {
    mockThemeVars({});
    const palette = resolveThemePalette();
    expect(palette.colors).toEqual(DEFAULT_HOME_GRADIENT_COLORS);
    expect(palette.accent).toBeNull();
  });

  it('dérive une rampe monochrome depuis --background uniquement', () => {
    mockThemeVars({
      background: '#f8f5f0',
      primary: '#336699',
      accent: 'oklch(0.371 0 0)',
      'chart-1': '#e53935',
      'chart-2': '#689f38',
      'chart-3': '#64b5f6',
    });
    const palette = resolveThemePalette();
    // 7 couleurs : 3 nuances foncées, le fond pur, 3 nuances claires
    expect(palette.colors).toHaveLength(7);
    expect(palette.colors[3]).toBe('#f8f5f0'); // background, teinte pleine
    for (const hex of palette.colors) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
    // l'accent (halo) est une nuance claire du fond, pas une autre couleur
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(palette.accent).not.toBe('#336699');
  });

  it('sans background résoluble, retombe sur la palette par défaut', () => {
    mockThemeVars({ primary: '#336699', accent: '#123456' });
    const palette = resolveThemePalette();
    expect(palette.colors).toEqual(DEFAULT_HOME_GRADIENT_COLORS);
    expect(palette.accent).toBeNull();
  });

  it('la signature change quand le thème change (key pour remonter le canvas)', () => {
    mockThemeVars({ background: '#111111' });
    const a = resolveThemePalette();
    mockThemeVars({ background: '#222222' });
    const b = resolveThemePalette();
    expect(a.key).not.toBe(b.key);
  });
});
