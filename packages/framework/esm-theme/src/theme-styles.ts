/**
 * Contrat de thème EGEN = format de sortie de Tweakcn (EGEN Theme Studio).
 *
 * Un thème est `{ light, dark }` : deux objets plats de clés « shadcn » (couleurs, polices, rayon, ombres,
 * espacement des lettres, espacement). C'est exactement ce que l'éditeur enregistre et ce que l'API
 * `GET /api/v1/themes` renvoie dans le champ `styles`.
 *
 * Le calcul des variables CSS (dont les 8 ombres dérivées et les variables de crénage) reprend celui du
 * générateur de Tweakcn (utils/theme-style-generator.ts, utils/shadows.ts, utils/color-converter.ts — Apache-2.0,
 * voir NOTICE) afin qu'un thème ait le même rendu dans l'éditeur et dans les applications.
 *
 * Module sans dépendance Node : utilisable dans un navigateur.
 */
import { converter, parse, wcagContrast } from 'culori';
import { DEFAULT_THEME_STYLES } from './default-theme-styles.js';

export type ThemeMode = 'light' | 'dark';
/** Objet plat de clés de thème (sans le préfixe `--`). */
export type ThemeStyleProps = Record<string, string>;
export interface ThemeStyles {
  light: ThemeStyleProps;
  dark: ThemeStyleProps;
}
/** raw : valeurs telles qu'enregistrées (défaut). hsl/oklch : reformatage identique aux exports de Tweakcn. */
export type ThemeColorFormat = 'raw' | 'hsl' | 'oklch' | 'hex' | 'rgb';

export const THEME_COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

/** Clés communes aux deux modes : la valeur du mode clair fait foi (même règle que Tweakcn). */
export const THEME_COMMON_KEYS = [
  'font-sans',
  'font-serif',
  'font-mono',
  'radius',
  'shadow-opacity',
  'shadow-blur',
  'shadow-spread',
  'shadow-offset-x',
  'shadow-offset-y',
  'letter-spacing',
  'spacing',
] as const;

export const THEME_REQUIRED_KEYS: readonly string[] = [
  ...THEME_COLOR_KEYS,
  'font-sans',
  'font-serif',
  'font-mono',
  'radius',
  'shadow-color',
  'shadow-opacity',
  'shadow-blur',
  'shadow-spread',
  'shadow-offset-x',
  'shadow-offset-y',
  'letter-spacing',
];
export const THEME_OPTIONAL_KEYS: readonly string[] = ['spacing'];
const KNOWN_KEYS = new Set<string>([...THEME_REQUIRED_KEYS, ...THEME_OPTIONAL_KEYS]);

export const defaultThemeStyles: ThemeStyles = DEFAULT_THEME_STYLES as unknown as ThemeStyles;

// ---------------------------------------------------------------------------------------------------------------------
// Couleurs (port de utils/color-converter.ts)
// ---------------------------------------------------------------------------------------------------------------------

const formatNumber = (num?: number): string | number => {
  if (!num) return '0';
  return num % 1 === 0 ? num : num.toFixed(4);
};

/** `v4 = true` : `hsl(h s% l%)` ; sinon `h s% l%` (utilisé à l'intérieur des ombres). */
export function formatColor(
  value: string,
  format: ThemeColorFormat = 'raw',
  hslFunction = true
): string {
  if (format === 'raw') return value;
  try {
    const color = parse(value);
    if (!color) throw new Error('Invalid color input');
    switch (format) {
      case 'hsl': {
        const hsl = converter('hsl')(color);
        const body = `${formatNumber(hsl.h)} ${formatNumber(hsl.s * 100)}% ${formatNumber(hsl.l * 100)}%`;
        return hslFunction ? `hsl(${body})` : body;
      }
      case 'oklch': {
        const o = converter('oklch')(color);
        return `oklch(${formatNumber(o.l)} ${formatNumber(o.c)} ${formatNumber(o.h)})`;
      }
      case 'rgb': {
        const r = converter('rgb')(color);
        const c = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255);
        return `rgb(${c(r.r)}, ${c(r.g)}, ${c(r.b)})`;
      }
      case 'hex': {
        const r = converter('rgb')(color);
        const h = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
        return `#${h(r.r)}${h(r.g)}${h(r.b)}`;
      }
      default:
        return value;
    }
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Ombres (port de utils/shadows.ts)
// ---------------------------------------------------------------------------------------------------------------------

/** Les 8 ombres dérivées des paramètres bruts `shadow-*`. */
export function buildShadowMap(props: ThemeStyleProps): Record<string, string> {
  const hsl = formatColor(props['shadow-color'], 'hsl', false);
  const offsetX = props['shadow-offset-x'];
  const offsetY = props['shadow-offset-y'];
  const blur = props['shadow-blur'];
  const spread = props['shadow-spread'];
  const opacity = parseFloat(props['shadow-opacity']);
  const color = (m: number) => `hsl(${hsl} / ${(opacity * m).toFixed(2)})`;

  const secondLayer = (fixedOffsetY: string, fixedBlur: string) => {
    const spread2 = (parseFloat(spread?.replace('px', '') ?? '0') - 1).toString() + 'px';
    return `${offsetX} ${fixedOffsetY} ${fixedBlur} ${spread2} ${color(1.0)}`;
  };
  const first = `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}`;

  return {
    'shadow-2xs': `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`,
    'shadow-xs': `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`,
    'shadow-sm': `${first}, ${secondLayer('1px', '2px')}`,
    shadow: `${first}, ${secondLayer('1px', '2px')}`,
    'shadow-md': `${first}, ${secondLayer('2px', '4px')}`,
    'shadow-lg': `${first}, ${secondLayer('4px', '6px')}`,
    'shadow-xl': `${first}, ${secondLayer('8px', '10px')}`,
    'shadow-2xl': `${offsetX} ${offsetY} ${blur} ${spread} ${color(2.5)}`,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Variables CSS (port de utils/theme-style-generator.ts)
// ---------------------------------------------------------------------------------------------------------------------

export interface ThemeCssOptions {
  colorFormat?: ThemeColorFormat;
}

/**
 * Variables CSS d'un mode, dans l'ordre du générateur de Tweakcn : couleurs, polices, rayon, ombres brutes,
 * ombres dérivées, puis (mode clair seulement) `--tracking-normal` et `--spacing`.
 * Les clés absentes reprennent le thème par défaut.
 */
export function themeStylesToVariables(
  styles: ThemeStyles,
  mode: ThemeMode,
  options: ThemeCssOptions = {}
): Array<[string, string]> {
  const fmt = options.colorFormat ?? 'raw';
  const props: ThemeStyleProps = { ...defaultThemeStyles[mode], ...styles[mode] };
  const vars: Array<[string, string]> = [];

  for (const key of THEME_COLOR_KEYS) vars.push([key, formatColor(props[key], fmt)]);
  for (const key of ['font-sans', 'font-serif', 'font-mono']) vars.push([key, props[key]]);
  vars.push(['radius', props.radius]);
  vars.push(['shadow-x', props['shadow-offset-x']]);
  vars.push(['shadow-y', props['shadow-offset-y']]);
  vars.push(['shadow-blur', props['shadow-blur']]);
  vars.push(['shadow-spread', props['shadow-spread']]);
  vars.push(['shadow-opacity', props['shadow-opacity']]);
  vars.push(['shadow-color', props['shadow-color']]);
  for (const [name, value] of Object.entries(buildShadowMap(props))) vars.push([name, value]);

  if (mode === 'light') {
    vars.push(['tracking-normal', styles.light['letter-spacing'] ?? defaultThemeStyles.light['letter-spacing']]);
    vars.push(['spacing', styles.light.spacing ?? defaultThemeStyles.light.spacing]);
  }
  return vars;
}

/** Bloc CSS d'un mode : `:root { … }` (clair) ou `.dark { … }` (sombre). */
export function themeStylesToCssBlock(
  styles: ThemeStyles,
  mode: ThemeMode,
  options: ThemeCssOptions = {}
): string {
  assertSafeThemeProps(styles[mode], mode); // le CSS est le puits : jamais de valeur hors grammaire
  const selector = mode === 'dark' ? '.dark' : ':root';
  const body = themeStylesToVariables(styles, mode, options)
    .map(([name, value]) => `\n  --${name}: ${value};`)
    .join('');
  return `${selector} {${body}\n}`;
}

/** `:root { … }` puis `.dark { … }`, séparés par une ligne vide. */
export function themeStylesToCss(styles: ThemeStyles, options: ThemeCssOptions = {}): string {
  return `${themeStylesToCssBlock(styles, 'light', options)}\n\n${themeStylesToCssBlock(styles, 'dark', options)}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Sécurité : grammaire stricte des valeurs (les valeurs sont écrites telles quelles dans du CSS)
// ---------------------------------------------------------------------------------------------------------------------

export const MAX_THEME_VALUE_LENGTH = 512;
const KEY_RE = /^[a-z][a-z0-9-]{0,62}$/;
/** Jamais admis, quelle que soit la clé : sortie de règle, @-règles, ressources distantes, échappements. */
// Les caractères de contrôle sont volontairement dans cette expression : ils sont interdits dans toute valeur de thème.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_RE = /[;{}<>\\@\u0000-\u001f]|url\s*\(|expression|javascript:|\/\*|\*\//i;
const COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(?:oklch|oklab|lab|lch|hsl|hsla|rgb|rgba|hwb)\([0-9a-zA-Z%\s,./+-]*\))$/;
const DIMENSION_RE = /^(?:-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vw|vh|ch|ex|pt|cm|mm|in)?|normal)$/;
const FONT_RE = /^[A-Za-z0-9 ,'"_.-]+$/;
const GENERIC_RE = /^[A-Za-z0-9 #%(),.+/'"_-]*$/;
const DIMENSION_KEYS = new Set(['radius', 'spacing', 'letter-spacing', 'shadow-blur', 'shadow-spread', 'shadow-offset-x', 'shadow-offset-y']);
const COLOR_KEY_SET = new Set<string>([...THEME_COLOR_KEYS, 'shadow-color']);

export function isSafeThemeKey(key: string): boolean {
  return KEY_RE.test(key);
}

/** null si la valeur est sûre pour cette clé, sinon le motif du refus. */
export function themeValueProblem(key: string, value: unknown): string | null {
  if (typeof value !== 'string') return 'doit être une chaîne';
  const v = value.trim();
  if (v === '') return 'ne doit pas être vide';
  if (v.length > MAX_THEME_VALUE_LENGTH) return `trop longue (${MAX_THEME_VALUE_LENGTH} caractères max)`;
  if (FORBIDDEN_RE.test(v)) return 'contient un caractère ou une construction interdits (; { } < > @ \\ url() /* */)';
  if (COLOR_KEY_SET.has(key)) {
    if (!COLOR_RE.test(v) || !parse(v)) return `couleur non reconnue ("${v}")`;
  } else if (DIMENSION_KEYS.has(key)) {
    if (!DIMENSION_RE.test(v)) return `dimension non reconnue ("${v}")`;
  } else if (key === 'shadow-opacity') {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1) return 'nombre entre 0 et 1 attendu';
  } else if (key.startsWith('font-')) {
    if (!FONT_RE.test(v)) return `liste de polices non reconnue ("${v}")`;
  } else if (!GENERIC_RE.test(v)) {
    return 'caractères non autorisés';
  }
  return null;
}

/** Sûreté seule (clés et valeurs présentes), sans exiger la complétude : garde du puits CSS et des surcharges. */
export function assertSafeThemeProps(props: Record<string, unknown> | undefined, label: string): void {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (!isSafeThemeKey(key)) throw new Error(`${label}.${key} : nom de clé invalide`);
    const problem = themeValueProblem(key, value);
    if (problem) throw new Error(`${label}.${key} : ${problem}`);
  }
}

export function assertSafeThemeStyles(styles: ThemeStyles): void {
  assertSafeThemeProps(styles?.light, 'light');
  assertSafeThemeProps(styles?.dark, 'dark');
}

// ---------------------------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------------------------

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide un document de thème. Erreurs : structure ou clés obligatoires manquantes/vides.
 * Avertissements : clés inconnues (le format pourra s'enrichir), couleurs non reconnues, contrastes faibles.
 */
export function validateThemeStyles(input: unknown): ThemeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Le thème doit être un objet { light, dark }'], warnings };
  }
  const doc = input as Record<string, unknown>;
  for (const mode of ['light', 'dark'] as const) {
    const props = doc[mode];
    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      errors.push(`Mode "${mode}" manquant ou invalide`);
      continue;
    }
    const p = props as Record<string, unknown>;
    for (const key of THEME_REQUIRED_KEYS) {
      const v = p[key];
      if (typeof v !== 'string' || v.trim() === '') errors.push(`${mode}.${key} est obligatoire (chaîne non vide)`);
    }
    for (const key of Object.keys(p)) {
      if (!isSafeThemeKey(key)) {
        errors.push(`${mode}.${key} : nom de clé invalide`);
        continue;
      }
      if (!KNOWN_KEYS.has(key)) warnings.push(`${mode}.${key} : clé inconnue (conservée telle quelle)`);
      // Les valeurs manquantes/vides des clés obligatoires sont déjà signalées plus haut.
      if (p[key] === undefined || (typeof p[key] === 'string' && (p[key] as string).trim() === '' && THEME_REQUIRED_KEYS.includes(key))) continue;
      const problem = themeValueProblem(key, p[key]);
      if (problem) errors.push(`${mode}.${key} : ${problem}`);
    }
  }
  for (const key of Object.keys(doc)) {
    if (key !== 'light' && key !== 'dark') warnings.push(`"${key}" : clé de premier niveau inconnue (ignorée)`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------------------------------------------------
// Accessibilité : contrastes WCAG des paires fond / texte
// ---------------------------------------------------------------------------------------------------------------------

const CONTRAST_PAIRS: Array<[string, string]> = [
  ['background', 'foreground'],
  ['card', 'card-foreground'],
  ['popover', 'popover-foreground'],
  ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'],
  ['muted', 'muted-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
  ['sidebar', 'sidebar-foreground'],
  ['sidebar-primary', 'sidebar-primary-foreground'],
  ['sidebar-accent', 'sidebar-accent-foreground'],
];

export interface ContrastEntry {
  mode: ThemeMode;
  background: string;
  foreground: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
}

export function themeContrastReport(styles: ThemeStyles): ContrastEntry[] {
  const out: ContrastEntry[] = [];
  for (const mode of ['light', 'dark'] as const) {
    for (const [bg, fg] of CONTRAST_PAIRS) {
      const a = parse(styles[mode]?.[bg] ?? '');
      const b = parse(styles[mode]?.[fg] ?? '');
      if (!a || !b) continue;
      const ratio = Math.round(wcagContrast(a, b) * 100) / 100;
      out.push({ mode, background: bg, foreground: fg, ratio, passesAA: ratio >= 4.5, passesAAA: ratio >= 7 });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Outils : forme canonique, différences, passerelle vers les tokens TokiForge
// ---------------------------------------------------------------------------------------------------------------------

/** JSON à clés triées : deux thèmes identiques donnent la même chaîne (base d'une empreinte). */
export function canonicalizeThemeStyles(styles: ThemeStyles): string {
  const sort = (o: ThemeStyleProps) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return JSON.stringify({ light: sort(styles.light), dark: sort(styles.dark) });
}

export interface ThemeStylesDiff {
  added: string[];
  removed: string[];
  changed: Array<{ path: string; from: string; to: string }>;
  identical: boolean;
}

export function diffThemeStyles(a: ThemeStyles, b: ThemeStyles): ThemeStylesDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: ThemeStylesDiff['changed'] = [];
  for (const mode of ['light', 'dark'] as const) {
    const x = a[mode] ?? {};
    const y = b[mode] ?? {};
    for (const key of Object.keys(y)) {
      if (!(key in x)) added.push(`${mode}.${key}`);
      else if (x[key] !== y[key]) changed.push({ path: `${mode}.${key}`, from: x[key], to: y[key] });
    }
    for (const key of Object.keys(x)) if (!(key in y)) removed.push(`${mode}.${key}`);
  }
  return { added, removed, changed, identical: !added.length && !removed.length && !changed.length };
}

// ---------------------------------------------------------------------------------------------------------------------
// Accessibilité : régressions de contraste (base → résultat fusionné)
// ---------------------------------------------------------------------------------------------------------------------

/** Paires qui passent AA dans `base` mais plus dans `merged` : le garde-fou des surcharges utilisateur. */
export function contrastRegressions(base: ThemeStyles, merged: ThemeStyles): ContrastEntry[] {
  const failedBefore = new Set(
    themeContrastReport(base)
      .filter((e) => !e.passesAA)
      .map((e) => `${e.mode}:${e.background}`)
  );
  return themeContrastReport(merged).filter((e) => !e.passesAA && !failedBefore.has(`${e.mode}:${e.background}`));
}
