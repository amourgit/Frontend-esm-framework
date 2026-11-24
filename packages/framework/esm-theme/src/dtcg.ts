/**
 * Projection DTCG (Design Tokens Community Group) du contrat de thème EGEN.
 *
 * Le document stocké reste le format Tweakcn, sans perte. Le DTCG en est une PROJECTION générée, lisible par Penpot
 * (import/export natif du JSON DTCG) et par Style Dictionary v4 (→ SCSS, TS, Android, Compose, Swift…).
 *
 * Choix : `$value` en chaîne pour les dimensions (forme largement acceptée ; le rapport 2025.10 prévoit un objet
 * { value, unit } et évolue — la version de schéma est portée par `$extensions`). Un jeu de tokens par mode.
 * L'opération inverse (`dtcgToThemeStyles`) est exacte : projeter puis relire redonne le thème d'origine.
 */
import { THEME_COLOR_KEYS, type ThemeMode, type ThemeStyleProps, type ThemeStyles } from './theme-styles.js';
import { themeValueProblem } from './theme-styles.js';

/** Version du document de thème stocké (format Tweakcn, niveau sémantique). */
export const THEME_SCHEMA_VERSION = 1;
export const SUPPORTED_THEME_SCHEMA_VERSIONS: readonly number[] = [1];

export const DTCG_EXTENSION_KEY = 'com.egen.theme';

export interface DtcgToken {
  $value: string;
  $type?: string;
  $description?: string;
}
export type DtcgGroup = { [name: string]: DtcgToken | DtcgGroup | Record<string, unknown> };

const COLOR_KEYS = new Set<string>(THEME_COLOR_KEYS);
/** Correspondance fixe clé du contrat ⇄ chemin DTCG (versionnée dans le code, testée : jamais configurable en production). */
const FIXED_PATHS: Record<string, { path: [string, string]; type: string }> = {
  'shadow-color': { path: ['shadow', 'color'], type: 'color' },
  'font-sans': { path: ['font', 'sans'], type: 'fontFamily' },
  'font-serif': { path: ['font', 'serif'], type: 'fontFamily' },
  'font-mono': { path: ['font', 'mono'], type: 'fontFamily' },
  radius: { path: ['radius', 'default'], type: 'dimension' },
  spacing: { path: ['spacing', 'base'], type: 'dimension' },
  'letter-spacing': { path: ['typography', 'letter-spacing'], type: 'dimension' },
  'shadow-opacity': { path: ['shadow', 'opacity'], type: 'number' },
  'shadow-blur': { path: ['shadow', 'blur'], type: 'dimension' },
  'shadow-spread': { path: ['shadow', 'spread'], type: 'dimension' },
  'shadow-offset-x': { path: ['shadow', 'offset-x'], type: 'dimension' },
  'shadow-offset-y': { path: ['shadow', 'offset-y'], type: 'dimension' },
};
const PATH_TO_KEY = new Map<string, string>(Object.entries(FIXED_PATHS).map(([key, v]) => [v.path.join('.'), key]));

export function themeStylesToDtcg(styles: ThemeStyles, mode: ThemeMode): DtcgGroup {
  const out: Record<string, Record<string, unknown>> = {};
  const put = (group: string, name: string, token: DtcgToken) => {
    (out[group] ??= {})[name] = token;
  };
  for (const [key, value] of Object.entries(styles[mode] ?? {})) {
    if (COLOR_KEYS.has(key)) put('color', key, { $value: value, $type: 'color' });
    else if (FIXED_PATHS[key]) put(FIXED_PATHS[key].path[0], FIXED_PATHS[key].path[1], { $value: value, $type: FIXED_PATHS[key].type });
    else put('custom', key, { $value: value });
  }
  return {
    $extensions: { [DTCG_EXTENSION_KEY]: { schemaVersion: THEME_SCHEMA_VERSION, mode } },
    ...out,
  } as DtcgGroup;
}

export interface DtcgImportResult {
  styles: ThemeStyles;
  warnings: string[];
}

const isToken = (v: unknown): v is DtcgToken => !!v && typeof v === 'object' && '$value' in (v as object);

function readMode(set: DtcgGroup | undefined, label: string, warnings: string[]): ThemeStyleProps {
  const props: ThemeStyleProps = {};
  if (!set) return props;
  for (const [group, members] of Object.entries(set)) {
    if (group.startsWith('$')) continue;
    if (!members || typeof members !== 'object' || isToken(members)) {
      warnings.push(`${label}.${group} : groupe attendu`);
      continue;
    }
    for (const [name, token] of Object.entries(members as Record<string, unknown>)) {
      if (!isToken(token)) {
        warnings.push(`${label}.${group}.${name} : jeton attendu (groupes imbriqués non pris en charge)`);
        continue;
      }
      const raw = (token as DtcgToken).$value;
      const value = typeof raw === 'number' ? String(raw) : raw;
      if (typeof value !== 'string') {
        warnings.push(`${label}.${group}.${name} : $value de type non pris en charge (chaîne ou nombre attendu)`);
        continue;
      }
      if (group === 'color' && COLOR_KEYS.has(name)) props[name] = value;
      else if (group === 'custom') props[name] = value;
      else {
        const key = PATH_TO_KEY.get(`${group}.${name}`);
        if (key) props[key] = value;
        else warnings.push(`${label}.${group}.${name} : jeton inconnu (ignoré)`);
      }
    }
  }
  return props;
}

/**
 * Relit deux jeux DTCG (clair/sombre) en document de thème. Les valeurs sont revérifiées (grammaire de sécurité) :
 * un fichier DTCG venu de l'extérieur n'est pas plus fiable qu'un autre.
 */
export function dtcgToThemeStyles(sets: { light?: DtcgGroup; dark?: DtcgGroup }): DtcgImportResult {
  const warnings: string[] = [];
  const styles: ThemeStyles = { light: readMode(sets.light, 'light', warnings), dark: readMode(sets.dark, 'dark', warnings) };
  for (const mode of ['light', 'dark'] as const) {
    for (const [key, value] of Object.entries(styles[mode])) {
      const problem = themeValueProblem(key, value);
      if (problem) {
        warnings.push(`${mode}.${key} : ${problem} (valeur retirée)`);
        delete styles[mode][key];
      }
    }
  }
  return { styles, warnings };
}
