// @egen-civitas/esm-theme — couche d'intégration EGEN du Design System (modèle de thème, orchestration, application).
// La transformation en CSS est assurée par TokiForge (@tokiforge/core). Variables générées : `--egen-<chemin>`.
export type {
  GlobalOverrideOptions,
  LoadedTheme,
  OverrideOptions,
  ThemeDocument,
  ThemeEngineOptions,
  ThemeEngineState,
  ThemeMeta,
  ThemeMode,
  ThemeOverride,
  ThemeStatus,
  ThemeStorage,
  ThemeVars,
} from './model/types.js';
export type { ThemeValidationResult } from './model/validate.js';

export { ThemeEngine } from './engine.js';
export {
  applyAppThemeOverride,
  applyGlobalThemeOverride,
  getThemeEngine,
  getThemeState,
  isGlobalThemeOverrideApplied,
  reloadTheme,
  removeAppThemeOverride,
  removeGlobalThemeOverride,
  setThemeMode,
  setupThemeEngine,
  toggleThemeMode,
} from './singleton.js';

export { ThemeValidationError } from './model/errors.js';
export { validateThemeDocument, validateThemeOverride } from './model/validate.js';
export { deepMerge, mergeByPriority } from './model/merge.js';
export { BASE_VARIANT, DEFAULT_STATE, componentCascade, componentVar, componentVarName } from './model/components.js';
export { CSS_VAR_PREFIX, themeToCssVars } from './tokiforge/compile.js';
