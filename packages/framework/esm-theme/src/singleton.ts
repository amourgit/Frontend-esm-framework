import { ThemeEngine } from './engine.js';
import type {
  GlobalOverrideOptions,
  OverrideOptions,
  ThemeDocument,
  ThemeEngineOptions,
  ThemeEngineState,
  ThemeMode,
} from './model/types.js';

let engine: ThemeEngine | null = null;

/** Initialise le moteur (au boot du shell) et applique le thème. Remplace une instance précédente. */
export async function setupThemeEngine(options: ThemeEngineOptions): Promise<ThemeEngine> {
  engine?.destroy();
  engine = new ThemeEngine(options);
  await engine.apply();
  return engine;
}

export function getThemeEngine(): ThemeEngine {
  if (!engine)
    throw new Error(
      '[egen-civitas/esm-theme] ThemeEngine non initialisé. Appelez setupThemeEngine() au boot du shell.',
    );
  return engine;
}

export const getThemeState = (): ThemeEngineState | null => engine?.getState() ?? null;
export const reloadTheme = async (): Promise<void> => void (await engine?.apply());
export const setThemeMode = (mode: ThemeMode): void => engine?.setMode(mode);
export const toggleThemeMode = (): void => engine?.toggleMode();

export const applyAppThemeOverride = (
  scope: string,
  document: Partial<ThemeDocument>,
  options?: OverrideOptions,
): void => engine?.applyAppOverride(scope, document, options);
export const removeAppThemeOverride = (scope: string, id?: string): void => engine?.removeAppOverride(scope, id);
export const applyGlobalThemeOverride = (document: Partial<ThemeDocument>, options?: GlobalOverrideOptions): void =>
  engine?.applyGlobalOverride(document, options);
export const removeGlobalThemeOverride = (id?: string): void => engine?.removeGlobalOverride(id);
export const isGlobalThemeOverrideApplied = (id?: string): boolean => engine?.isGlobalOverrideApplied(id) ?? false;
