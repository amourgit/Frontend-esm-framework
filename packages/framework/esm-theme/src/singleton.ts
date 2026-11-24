/**
 * Instance unique du runtime de thème, partagée par le shell et les applications.
 *
 * MICRO-FRONTENDS : ce module DOIT être partagé en singleton (`@egen-civitas/esm-theme`, `singleton: true`)
 * par toutes les applications. Si chaque application embarquait sa propre copie, plusieurs instances
 * coexisteraient et réécriraient la même balise `<style>`.
 *
 * Le shell démarre toujours : le thème de repli embarqué est appliqué immédiatement, puis remplacé par
 * celui du backend du Core si celui-ci répond à temps et que sa réponse est valide.
 */
import { defaultThemeStyles, type ThemeMode } from './theme-styles.js';
import { ThemeStylesRuntime, type ThemeStylesRuntimeOptions } from './theme-styles-runtime.js';
import { fetchTheme, reportThemeApplied, type ResolvedTheme } from './client.js';

export const THEME_MODE_STORAGE_KEY = 'egen-theme-mode';

export interface SetupThemeOptions {
  /** Identifiant d'application transmis au backend (`?app=`). */
  app?: string;
  /** Chemin relatif de même origine du thème. Défaut : `/api/theme`. */
  endpoint?: string;
  /** Mode initial si aucun choix n'est mémorisé. Défaut : `dark`. */
  defaultMode?: ThemeMode;
  /** Clé `localStorage` du choix de mode ; `null` désactive la mémorisation. Défaut : `egen-theme-mode`. */
  modeStorageKey?: string | null;
  /** Délai maximal d'attente du backend avant de garder le thème de repli. Défaut : 3000 ms. */
  timeoutMs?: number;
  /** Transmettre au backend l'accusé du thème appliqué. Défaut : `true`. */
  reportApplied?: boolean;
  /** Options du runtime (élément racine, identifiant du `<style>`, format des couleurs, classe sombre). */
  runtime?: ThemeStylesRuntimeOptions;
  /** Implémentation de `fetch` (tests). */
  fetch?: typeof fetch;
}

interface Active {
  runtime: ThemeStylesRuntime;
  options: SetupThemeOptions;
  etag: string | null;
  unsubscribe: () => void;
}

let _active: Active | null = null;

function readStoredMode(key: string | null): ThemeMode | null {
  if (key === null || typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(key);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function storeMode(key: string | null, mode: ThemeMode): void {
  if (key === null || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // stockage indisponible (navigation privée, quota…) : non bloquant
  }
}

/** Récupère le thème du backend ; renvoie `null` (en gardant l'état actuel) si indisponible ou invalide. */
async function pull(a: Active, useEtag: boolean): Promise<ResolvedTheme | null> {
  const { options } = a;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), options.timeoutMs ?? 3000) : null;
  try {
    const r = await fetchTheme({
      app: options.app,
      endpoint: options.endpoint,
      etag: useEtag ? a.etag : null,
      fetch: options.fetch,
      signal: ctrl?.signal,
    });
    if (r.status === 304) return null;
    a.runtime.apply(r.theme.styles); // contrôle de sécurité des valeurs avant toute écriture
    a.etag = r.etag;
    return r.theme;
  } catch (e) {
    console.warn('[esm-theme] Thème du backend non appliqué, thème de repli conservé :', (e as Error).message);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Initialise le thème global. À appeler une seule fois, au démarrage du shell.
 * Ne lève jamais : en cas d'échec réseau ou de réponse refusée, le thème de repli reste appliqué.
 */
export async function setupTheme(options: SetupThemeOptions = {}): Promise<ThemeStylesRuntime> {
  if (_active) {
    _active.unsubscribe();
    _active.runtime.destroy();
    _active = null;
  }
  const storageKey = options.modeStorageKey === undefined ? THEME_MODE_STORAGE_KEY : options.modeStorageKey;
  const mode = readStoredMode(storageKey) ?? options.defaultMode ?? 'dark';
  const runtime = new ThemeStylesRuntime(options.runtime);
  runtime.apply(defaultThemeStyles, mode); // le rendu ne dépend jamais du réseau
  const unsubscribe = runtime.subscribe((e) => {
    if (e.type === 'mode') storeMode(storageKey, e.mode);
  });
  const active: Active = { runtime, options, etag: null, unsubscribe };
  _active = active;

  const theme = await pull(active, false);
  if (theme && options.reportApplied !== false) {
    void reportThemeApplied(theme, { app: options.app, fetch: options.fetch });
  }
  return runtime;
}

/** Instance du runtime. Lève une erreur si `setupTheme()` n'a pas encore été appelé. */
export function getTheme(): ThemeStylesRuntime {
  if (!_active) {
    throw new Error('[esm-theme] Thème non initialisé. Appelez setupTheme() au démarrage du shell.');
  }
  return _active.runtime;
}

/** Mode courant, ou `null` si le thème n'est pas encore initialisé. */
export function getThemeMode(): ThemeMode | null {
  return _active?.runtime.getMode() ?? null;
}

/** Change le mode clair/sombre (mémorisé). Sans effet si le thème n'est pas initialisé. */
export function setThemeMode(mode: ThemeMode): void {
  _active?.runtime.setMode(mode);
}

/** Bascule le mode clair/sombre (mémorisé). Renvoie le nouveau mode, ou `null` si non initialisé. */
export function toggleThemeMode(): ThemeMode | null {
  return _active?.runtime.toggleMode() ?? null;
}

/**
 * Redemande le thème au backend (avec l'`ETag` connu) et l'applique s'il a changé.
 * Renvoie `true` si un nouveau thème a été appliqué.
 */
export async function reloadTheme(): Promise<boolean> {
  if (!_active) return false;
  const theme = await pull(_active, true);
  if (theme && _active.options.reportApplied !== false) {
    void reportThemeApplied(theme, { app: _active.options.app, fetch: _active.options.fetch });
  }
  return theme !== null;
}
