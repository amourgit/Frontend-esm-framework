// =============================================================================
//  @egen/esm-ai-config — Store Zustand de configuration IA
//
//  Suit exactement le pattern des stores EGEN existants :
//    createGlobalStore + subscribeTo + getGlobalStore
//  Compatible avec useStore() de @egen/esm-react-utils.
// =============================================================================

import { createGlobalStore, subscribeTo } from '@egen/esm-state';
import type { AIConfig, AIConfigStore, PartialAIConfig } from './types';
import { DEFAULT_AI_CONFIG } from './defaults';
import { validateAIConfig, mergeConfig } from './validation';

/** Nom du store — doit être unique dans l'application EGEN */
const STORE_NAME = 'egen:ai:config';

/**
 * Store Zustand global de la configuration IA EGEN.
 *
 * Usage direct (avancé) :
 * ```ts
 * import { aiConfigStore } from '@egen/esm-ai-config';
 * const { config } = aiConfigStore.getState();
 * ```
 *
 * Usage React (recommandé) :
 * ```ts
 * import { useAIConfig } from '@egen/esm-ai-config';
 * const { enabled } = useAIConfig();
 * ```
 */
export const aiConfigStore = createGlobalStore<AIConfigStore>(STORE_NAME, {
  config: DEFAULT_AI_CONFIG,
  loaded: true,
  errors: [],
  source: 'default',
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Applique un override partiel de configuration.
 * Valide la configuration résultante et ne l'applique que si elle est valide.
 *
 * @param override La configuration partielle à fusionner.
 * @param source La source de l'override (pour le debugging).
 * @returns `true` si l'override a été appliqué, `false` si la validation a échoué.
 */
export function overrideAIConfig(override: PartialAIConfig, source: AIConfigStore['source'] = 'override'): boolean {
  const current = aiConfigStore.getState().config;
  const merged = mergeConfig(current, override);
  const validation = validateAIConfig(merged);

  if (validation.warnings.length > 0) {
    console.warn('[EGEN AI Config] Avertissements de configuration :', validation.warnings);
  }

  if (!validation.valid) {
    console.error('[EGEN AI Config] Configuration invalide, override rejeté :', validation.errors);
    aiConfigStore.setState((s) => ({ ...s, errors: validation.errors }));
    return false;
  }

  aiConfigStore.setState({
    config: merged,
    loaded: true,
    errors: [],
    source,
  });

  return true;
}

/**
 * Réinitialise la configuration aux valeurs par défaut (env vars).
 */
export function resetAIConfig(): void {
  const validation = validateAIConfig(DEFAULT_AI_CONFIG);
  aiConfigStore.setState({
    config: DEFAULT_AI_CONFIG,
    loaded: true,
    errors: validation.errors,
    source: 'default',
  });
}

/**
 * Retourne la configuration IA courante (non réactive).
 * Pour la version réactive, utiliser le store ou useAIConfig().
 */
export function getAIConfig(): AIConfig {
  return aiConfigStore.getState().config;
}

/**
 * S'abonne aux changements de configuration.
 * @returns Fonction de désinscription.
 */
export function subscribeToAIConfig(callback: (config: AIConfig) => void): () => void {
  return subscribeTo(aiConfigStore, (state) => state.config, callback);
}
