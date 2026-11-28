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
 * UNE SEULE SOURCE : `--primary`. Chaque mode clair/sombre charge sa propre
 * valeur du token ; la rampe de teintes monochrome en découle et l'animation
 * suit — jamais de multicouleur.
 */

/** Token unique lu pour tout le fond : la couleur de marque du thème. */
const BRAND_TOKEN = 'primary';

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
  // UNE SEULE SOURCE : `--primary`. Chaque mode (light/dark) charge sa propre
  // valeur du token ; la rampe de teintes en découle et l'animation suit.
  const brand = themeColorToHex(readThemeVar(BRAND_TOKEN));

  let palette: string[];
  if (brand) {
    // Rampe monochrome de la couleur de marque : nuances foncées → marque →
    // nuances claires, toutes interpolées en OKLab. La surface derrière le
    // canvas est déjà `bg-background` (qui bascule light/dark) : les vagues
    // n'apportent que la teinte du thème, jamais de multicouleur.
    palette = [
      ...[0.7, 0.45, 0.2].map((t) => mixHex(brand, '#000000', t)),
      brand,
      ...[0.3, 0.55].map((t) => mixHex(brand, '#ffffff', t)),
    ];
  } else {
    palette = [...DEFAULT_HOME_GRADIENT_COLORS];
  }

  return { colors: palette, accent: brand, key: palette.join(',') };
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
