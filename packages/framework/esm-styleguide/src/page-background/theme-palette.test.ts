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

  it('dérive les couleurs des tokens du thème (oklch → hex)', () => {
    mockThemeVars({
      background: 'oklch(0.145 0 0)',
      primary: 'oklch(0.922 0 0)',
      accent: 'oklch(0.371 0 0)',
      'chart-1': '#e53935',
      'chart-2': '#689f38',
      'chart-3': '#64b5f6',
    });
    const palette = resolveThemePalette();
    expect(palette.colors).toEqual([
      '#0a0a0a', // background oklch(0.145)
      '#e5e5e5', // primary oklch(0.922)
      '#404040', // accent oklch(0.371)
      '#e53935',
      '#689f38',
      '#64b5f6',
    ]);
    // accent prioritaire : --accent résolu en hex
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('ignore les tokens non résolubles et conserve ceux qui le sont', () => {
    mockThemeVars({ primary: '#336699', 'chart-2': 'hsl(0 100% 50%)' });
    const palette = resolveThemePalette();
    expect(palette.colors).toEqual(['#336699', '#ff0000']);
    // accent absent → repli sur chart-2
    expect(palette.accent).toBe('#ff0000');
  });

  it('la signature change quand le thème change (key pour remonter le canvas)', () => {
    mockThemeVars({ primary: '#111111' });
    const a = resolveThemePalette();
    mockThemeVars({ primary: '#222222' });
    const b = resolveThemePalette();
    expect(a.key).not.toBe(b.key);
  });
});
