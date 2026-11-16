// Document de thème EGEN → variables CSS, via TokiForge (ADR-004 : TokiForge transforme, EGEN modélise).
// Nommage (ADR-002) : `--egen-<chemin-en-kebab>`.
import { TokenExporter, type DesignTokens } from '@tokiforge/core/runtime';
import { checkCssValue, serializeLeaf } from '../model/css-safety.js';
import { deepMerge } from '../model/merge.js';
import type { ThemeMode, ThemeVars } from '../model/types.js';

export const CSS_VAR_PREFIX = 'egen';
const IGNORED_ROOT_KEYS = new Set(['priority', 'meta']);

type Tree = { [key: string]: Tree | { value: string } };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isThemableBranch = (n: Record<string, unknown>): boolean => {
  const keys = Object.keys(n);
  return keys.length > 0 && keys.every((k) => k === 'light' || k === 'dark');
};
const toKebab = (s: string): string =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

export interface CompiledTheme {
  vars: ThemeVars;
  /** Feuilles ignorées car non sûres (chemin + raison) — pour l'avertissement de développement. */
  rejected: string[];
  tokens: { base: DesignTokens; light: DesignTokens; dark: DesignTokens };
}

/** Sépare base / light / dark et convertit chaque feuille en nœud `{ value }` attendu par TokiForge. */
function splitToTokens(doc: Record<string, unknown>): CompiledTheme['tokens'] & { rejected: string[] } {
  const trees: Record<'base' | 'light' | 'dark', Tree> = { base: {}, light: {}, dark: {} };
  const rejected: string[] = [];

  const put = (bucket: 'base' | 'light' | 'dark', segments: string[], value: unknown) => {
    const text = serializeLeaf(value);
    const verdict = checkCssValue(text);
    if (!verdict.ok) {
      rejected.push(`${segments.join('.')} — ${verdict.reason}`);
      return;
    }
    let cur = trees[bucket];
    segments.slice(0, -1).forEach((s) => {
      const next = cur[s];
      cur = (isObject(next) && !('value' in next && typeof next.value === 'string') ? next : (cur[s] = {})) as Tree;
    });
    cur[segments[segments.length - 1]] = { value: text };
  };

  const walk = (node: unknown, segments: string[], bucket: 'base' | 'light' | 'dark', depth: number): void => {
    if (isObject(node)) {
      if (depth > 0 && isThemableBranch(node)) {
        if (node.light !== undefined) walk(node.light, segments, 'light', depth + 1);
        if (node.dark !== undefined) walk(node.dark, segments, 'dark', depth + 1);
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (depth === 0 && IGNORED_ROOT_KEYS.has(key)) continue;
        const segment = toKebab(key);
        if (segment === 'value' && depth > 0) {
          rejected.push(`${[...segments, key].join('.')} — la clé « value » est réservée`);
          continue;
        }
        walk(value, [...segments, segment], bucket, depth + 1);
      }
    } else if (segments.length > 0) put(bucket, segments, node);
  };
  walk(doc, [], 'base', 0);
  return {
    base: trees.base as DesignTokens,
    light: trees.light as DesignTokens,
    dark: trees.dark as DesignTokens,
    rejected,
  };
}

const toVars = (tokens: DesignTokens): Record<string, string> =>
  Object.fromEntries(
    Object.entries(TokenExporter.flattenTokens(tokens, CSS_VAR_PREFIX)).map(([k, v]) => [`--${k}`, v]),
  );

export function compileTheme(doc: Record<string, unknown>): CompiledTheme {
  const { rejected, ...tokens } = splitToTokens(doc);
  return {
    vars: { base: toVars(tokens.base), light: toVars(tokens.light), dark: toVars(tokens.dark) },
    rejected,
    tokens,
  };
}

/** Variables CSS d'un document (aperçu, outils, Theme Studio). */
export const themeToCssVars = (doc: Record<string, unknown>): ThemeVars => compileTheme(doc).vars;

/**
 * Texte CSS : `:root` (base) + blocs par mode. Génération, sélecteur sûr et échappement : `TokenExporter` (TokiForge).
 */
export function buildThemeCss(compiled: CompiledTheme, targetSelector = ':root'): string {
  const block = (tokens: DesignTokens, selector: string) =>
    Object.keys(tokens).length ? TokenExporter.exportCSS(tokens, { selector, prefix: CSS_VAR_PREFIX }) : '';
  return [
    block(compiled.tokens.base, targetSelector),
    block(compiled.tokens.light, `${targetSelector}[data-theme='light'], [data-theme='light'] ${targetSelector}`),
    block(compiled.tokens.dark, `${targetSelector}[data-theme='dark'], [data-theme='dark'] ${targetSelector}`),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Un thème TokiForge par mode (`light`, `dark`) : TokiForge modélise le clair/sombre comme deux thèmes complets,
 * EGEN le modélise comme un seul document — l'adaptateur fait le pont. Le CSS de chaque thème est généré par TokiForge.
 */
export function toThemeConfig(compiled: CompiledTheme): { themes: Array<{ name: ThemeMode; tokens: DesignTokens }> } {
  const merged = (mode: ThemeMode) =>
    deepMerge(
      compiled.tokens.base as Record<string, unknown>,
      compiled.tokens[mode] as Record<string, unknown>,
    ) as DesignTokens;
  return {
    themes: [
      { name: 'light', tokens: merged('light') },
      { name: 'dark', tokens: merged('dark') },
    ],
  };
}
