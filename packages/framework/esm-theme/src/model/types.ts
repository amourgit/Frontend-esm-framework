// ============================================================================
//  Modèle de thème EGEN — types publics
//  Le *document de thème* est le concept EGEN (cahier des charges §11) : il ne dépend d'aucun moteur.
// ============================================================================

export type ThemeMode = 'light' | 'dark';

export interface ThemeMeta {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  [key: string]: unknown;
}

/**
 * Document de thème : sections racine libres (`colors`, `typography`, `borderRadius`, `components`…).
 * Un nœud dont les seules clés sont `light` / `dark` définit une valeur par mode.
 */
export interface ThemeDocument {
  /** Priorité de sélection du thème de base (le plus élevé gagne). Absente pour une surcharge. */
  priority?: number;
  meta?: ThemeMeta;
  [section: string]: unknown;
}

/** Variables CSS compilées (`--egen-…`) : `base` commun, `light` / `dark` par mode. */
export interface ThemeVars {
  base: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface LoadedTheme {
  url: string;
  priority: number;
  document: ThemeDocument;
}

export interface ThemeOverride {
  id: string;
  priority: number;
  document: Partial<ThemeDocument>;
}

export interface OverrideOptions {
  id?: string;
  priority?: number;
}

export interface GlobalOverrideOptions extends OverrideOptions {
  /** Conserve la surcharge (stockage local, clé `overridesStorageKey`) et la réapplique au prochain démarrage. */
  persist?: boolean;
}

/** Stockage minimal (compatible `localStorage`) — injectable pour les tests et les cibles sans `window`. */
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ThemeStatus = 'idle' | 'loading' | 'applied' | 'error';

export interface ThemeEngineOptions {
  /** URL des thèmes JSON ; le plus prioritaire est retenu. */
  themeUrls: string[];
  /** Documents fournis en ligne (tests, Storybook, SSR, natif) — mis en concurrence avec les URL par priorité. */
  themeDocuments?: ThemeDocument[];
  /** Rechargement périodique (ms) pour le hot-reload en développement ; 0 = désactivé. */
  pollIntervalMs?: number;
  /** Sélecteur cible des variables globales (défaut `:root`). */
  targetSelector?: string;
  /** Mode initial si ni attribut `data-theme` ni valeur mémorisée (défaut `dark`). */
  defaultMode?: ThemeMode;
  /** Clé `localStorage` du mode (défaut `egen-theme-mode`) ; `null` = ne pas mémoriser. */
  modeStorageKey?: string | null;
  /** Clé `localStorage` des surcharges globales persistées (défaut `egen-theme-applied`) ; `null` = désactivé. */
  overridesStorageKey?: string | null;
  /** Stockage utilisé (défaut `window.localStorage` si disponible). */
  storage?: ThemeStorage;
  onApplied?: (theme: LoadedTheme, vars: ThemeVars) => void;
  onError?: (error: Error) => void;
  onModeChanged?: (mode: ThemeMode) => void;
}

export interface ThemeEngineState {
  status: ThemeStatus;
  activeTheme: LoadedTheme | null;
  mode: ThemeMode;
  cssVarsCount: number;
  error: string | null;
  lastApplied: number | null;
  /** Scopes d'application qui ont une surcharge active (hors surcharges globales). */
  activeOverrideScopes: string[];
  /** Ids des surcharges globales actives. */
  activeGlobalOverrides: string[];
}
