import { useEffect, useState } from 'react';
import { converter, formatHex, interpolate, parse } from 'culori';

/**
 * Palette du fond animé dérivée des tokens du thème (contrat Tweakcn, variables
 * CSS écrites par @egen-civitas/esm-theme sur `:root` / `.dark`).
 *
 * Le canvas WebGL de `GradientWave` n'accepte que des couleurs résolues : on lit
 * donc les variables calculées (`getComputedStyle`) puis on les convertit en hex
 * via culori — même bibliothèque que esm-theme, donc même gestion des formats
 * (oklch, oklab, hsl, rgb…).
 *
 * UNE SEULE TEINTE : la palette est construite en interpolant `--background`
 * vers la couleur de marque (`--primary`, repli accent/chart) en OKLab. Comme
 * les tokens basculent avec le mode clair/sombre, tout le dégradé suit
 * fortement light/dark — les couches de vagues ne sont que des teintes plus ou
 * moins marquées de cette même couleur, jamais de multicouleur.
 */

/** Token de surface de base (première couleur du dégradé). */
const BG_TOKEN = 'background';

/** Tokens essayés, par ordre de préférence, pour la teinte de marque unique. */
const BRAND_TOKENS = ['primary', 'accent', 'chart-1'] as const;

/** Repli quand aucune variable de thème n'est résolvable (storybook, tests, thème absent). */
export const DEFAULT_HOME_GRADIENT_COLORS = [
  '#0b192c',
  '#0f172a',
  '#134e4a',
  '#0f766e',
  '#14b8a6',
  '#2dd4bf',
];


/** Convertit une couleur CSS quelconque (oklch, hsl, rgb, hex…) en `#rrggbb`. `null` si illisible. */
export function themeColorToHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('var(')) return null;
  try {
    const color = parse(trimmed);
    if (!color) return null;
    const rgb = converter('rgb')(color);
    const h = (n: number) =>
      Math.round(Math.max(0, Math.min(1, n)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
  } catch {
    return null;
  }
}

/** Lit une variable du thème (`--<name>`) telle que calculée sur `:root`. */
function readThemeVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
}

function firstHex(tokens: readonly string[]): string | null {
  for (const token of tokens) {
    const hex = themeColorToHex(readThemeVar(token));
    if (hex) return hex;
  }
  return null;
}

/** `#rrggbb` à `t` (0-1) entre deux hex, interpolation OKLab — teintes d'une même couleur. */
function mixHex(from: string, to: string, t: number): string {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return to;
  return formatHex(interpolate([a, b], 'oklab')(t));
}

export interface ThemePalette {
  /** Couleurs hex pour `GradientWave` (base + couches). */
  colors: string[];
  /** Couleur d'accent hex pour les halos, ou `null` si aucune n'est résolue. */
  accent: string | null;
  /** Signature des couleurs : change quand le thème change — sert de `key` pour remonter le canvas. */
  key: string;
}

/** Résout la palette courante depuis les variables CSS du thème. */
export function resolveThemePalette(): ThemePalette {
  const background = themeColorToHex(readThemeVar(BG_TOKEN));
  const brand = firstHex(BRAND_TOKENS);

  let palette: string[];
  if (background && brand) {
    // Fond de base + couches de vagues = teintes croissantes de la même couleur
    // de marque, mélangées au fond : un seul hue, intensité variable.
    palette = [
      background,
      ...[0.2, 0.4, 0.6, 0.8, 1].map((t) => mixHex(background, brand, t)),
    ];
  } else {
    palette = [...DEFAULT_HOME_GRADIENT_COLORS];
  }

  const accent = brand;
  return { colors: palette, accent, key: palette.join(',') };
}

/** `#rrggbb` + alpha (0-1) → `#rrggbbaa`. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Palette du thème, réactive : se recalcule quand le bloc `<style id="egen-theme">`
 * est réécrit (apply/surcharge) ou quand la classe de mode (`dark`) bascule sur
 * l'élément racine. Aucune dépendance à esm-theme : on observe le DOM.
 */
export function useThemePalette(): ThemePalette {
  const [palette, setPalette] = useState<ThemePalette>(() => resolveThemePalette());

  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setPalette(resolveThemePalette());
      });
    };

    const observer = new MutationObserver(update);
    // Bascule clair/sombre : classe `dark` sur l'élément racine.
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // Réécriture du bloc de thème (`<style id="egen-theme">`) ou son apparition tardive :
    // on observe tout le <head>, les mutations y sont rares et `update` est coalescé par rAF.
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });

    update();
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return palette;
}
