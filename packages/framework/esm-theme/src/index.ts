// ============================================================================
//  @egen-civitas/esm-theme — Point d'entrée public
// ============================================================================

// Types
export type {
  ThemeSchema,
  ThemeEngineOptions,
  ThemeEngineState,
  ThemeMode,
  LoadedTheme,
  FlattenResult,
  ColorScale,
  SurfaceTokens,
  BorderTokens,
  PanelLayer,
  PanelTokenSet,
  AppThemeOverride,
} from './types.js';

// Moteur principal
export { ThemeEngine } from './engine.js';

// Singleton global (utilisé par le shell et les apps)
export {
  setupThemeEngine,
  getThemeEngine,
  getThemeState,
  reloadTheme,
  setThemeMode,
  toggleThemeMode,
  applyAppThemeOverride,
  removeAppThemeOverride,
  applyGlobalThemeOverride,
  removeGlobalThemeOverride,
} from './singleton.js';

// Utilitaires bas niveau (utiles pour les outils de build, tests, storybook)
export { flattenToCssVars } from './flatten.js';
export {
  buildCssString,
  buildThemeCssText,
  injectCssVarsToDocument,
  removeCssVarsFromDocument,
  injectScopedCssVars,
  removeScopedCssVars,
  applyModeAttribute,
} from './inject.js';
export { loadHighestPriorityTheme, loadHighestPriorityThemeIfChanged } from './loader.js';
export { deepMerge, mergeBySortedPriority } from './deepMerge.js';
export { validateThemeSchema } from './schema.js';
export type { ThemeValidationResult } from './schema.js';
