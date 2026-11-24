// ============================================================================
//  @egen-civitas/esm-theme — Point d'entrée public
// ============================================================================

// Contrat de thème (format Tweakcn), validation, contrastes, diff, forme canonique, sortie CSS
export * from './theme-styles.js';

// Runtime navigateur : variables CSS sur :root, classe .dark, surcharges, abonnements
export {
  ThemeStylesRuntime,
  themeKeyToVariable,
  type ThemeStylesRuntimeOptions,
  type ThemeRuntimeEvent,
  type PartialThemeStyles,
} from './theme-styles-runtime.js';

// Projection DTCG sans perte
export * from './dtcg.js';

// Client du backend du Core (même origine uniquement)
export {
  THEME_ENDPOINT,
  THEME_APPLIED_ENDPOINT,
  assertSameOriginPath,
  fetchTheme,
  parseResolvedTheme,
  reportThemeApplied,
  type FetchThemeResult,
  type ResolvedTheme,
  type ResolvedThemeSources,
  type ThemeClientOptions,
} from './client.js';

// Instance unique, partagée par le shell et les applications
export {
  THEME_MODE_STORAGE_KEY,
  setupTheme,
  getTheme,
  getThemeMode,
  setThemeMode,
  toggleThemeMode,
  reloadTheme,
  type SetupThemeOptions,
} from './singleton.js';
