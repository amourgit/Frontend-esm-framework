// ============================================================================
//  @egen/esm-theme — Point d'entrée public
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
} from './types';

// Moteur principal
export { ThemeEngine } from './engine';

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
} from './singleton';

// Utilitaires bas niveau (utiles pour les outils de build, tests, storybook)
export { flattenToCssVars } from './flatten';
export {
  buildCssString,
  buildThemeCssText,
  injectCssVarsToDocument,
  removeCssVarsFromDocument,
  injectScopedCssVars,
  removeScopedCssVars,
  applyModeAttribute,
} from './inject';
export { loadHighestPriorityTheme, loadHighestPriorityThemeIfChanged } from './loader';
export { deepMerge, mergeBySortedPriority } from './deepMerge';
export { validateThemeSchema } from './schema';
export type { ThemeValidationResult } from './schema';
