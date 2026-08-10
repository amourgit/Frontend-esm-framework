// =============================================================================
//  @egen/esm-ai-config — React hooks
//  Pattern identique à useFeatureFlag() du framework.
// =============================================================================

import { useSyncExternalStore, useCallback } from 'react';
import { aiConfigStore } from './store';
import type { AIConfig, AIConfigStore } from './types';

/**
 * Hook React pour accéder à la configuration IA complète.
 * Réactif — se met à jour automatiquement quand la config change.
 *
 * @example
 * ```tsx
 * const { enabled, provider } = useAIConfig();
 * if (!enabled) return null;
 * ```
 */
export function useAIConfig(): AIConfig {
  return useSyncExternalStore(
    aiConfigStore.subscribe,
    () => aiConfigStore.getState().config,
    () => aiConfigStore.getState().config,
  );
}

/**
 * Hook React pour accéder au store complet (config + état de chargement + erreurs).
 *
 * @example
 * ```tsx
 * const { config, loaded, errors } = useAIConfigStore();
 * ```
 */
export function useAIConfigStore(): AIConfigStore {
  return useSyncExternalStore(
    aiConfigStore.subscribe,
    () => aiConfigStore.getState(),
    () => aiConfigStore.getState(),
  );
}

/**
 * Hook pour accéder à une propriété spécifique de la configuration.
 * Évite les re-renders inutiles si la propriété n'a pas changé.
 *
 * @example
 * ```tsx
 * const enabled = useAIConfigValue('enabled');
 * const model = useAIConfigValue('provider.model'); // Pas de chemin imbriqué — utiliser useAIConfig()
 * ```
 */
export function useAIEnabled(): boolean {
  return useSyncExternalStore(
    aiConfigStore.subscribe,
    () => aiConfigStore.getState().config.enabled,
    () => aiConfigStore.getState().config.enabled,
  );
}
