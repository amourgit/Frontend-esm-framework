// =============================================================================
//  @egen/esm-ai-context — Registre des Context Providers
// =============================================================================

import { dispatchAIEvent, AI_EVENTS } from '@egen/esm-ai-events';
import type { AIContextProvider } from './types';

interface ProviderEntry {
  provider: AIContextProvider;
  unsubscribe: (() => void) | null;
  changeCallback: (() => void) | null;
}

/** Registre interne des providers */
const _registry = new Map<string, ProviderEntry>();

/** Callbacks à appeler quand le registre change (pour le context builder) */
const _changeListeners = new Set<() => void>();

function notifyChange(): void {
  _changeListeners.forEach((cb) => cb());
}

/**
 * Enregistre un Context Provider.
 * Si un provider avec le même id existe déjà, il est remplacé.
 *
 * @example
 * ```ts
 * // Dans une app microfrontend :
 * export function startupApp() {
 *   registerAIContextProvider({
 *     id: 'schedule-app:active-week',
 *     name: 'Semaine active',
 *     priority: 5,
 *     provide: () => ({ activeWeek: activeWeekStore.getState().week }),
 *     subscribe: (cb) => activeWeekStore.subscribe(cb),
 *   });
 * }
 * ```
 */
export function registerAIContextProvider(provider: AIContextProvider): () => void {
  const existing = _registry.get(provider.id);

  // Nettoyer l'ancien provider s'il existe
  if (existing?.unsubscribe) {
    existing.unsubscribe();
  }

  let changeCallback: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;

  if (provider.subscribe) {
    changeCallback = () => notifyChange();
    unsubscribe = provider.subscribe(changeCallback);
  }

  _registry.set(provider.id, { provider, unsubscribe, changeCallback });

  dispatchAIEvent(AI_EVENTS.CONTEXT_PROVIDER_REGISTERED, {
    providerId: provider.id,
    providerName: provider.name,
  });

  notifyChange();

  // Retourne une fonction de désinscription
  return () => removeAIContextProvider(provider.id);
}

/**
 * Retire un Context Provider.
 * Nettoie les subscriptions internes.
 */
export function removeAIContextProvider(providerId: string): void {
  const entry = _registry.get(providerId);
  if (!entry) return;

  if (entry.unsubscribe) {
    entry.unsubscribe();
  }

  _registry.delete(providerId);

  dispatchAIEvent(AI_EVENTS.CONTEXT_PROVIDER_REMOVED, {
    providerId,
    providerName: entry.provider.name,
  });

  notifyChange();
}

/**
 * Retourne tous les providers triés par priorité décroissante.
 */
export function getAIContextProviders(): AIContextProvider[] {
  return Array.from(_registry.values())
    .map((e) => e.provider)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Collecte les données de tous les providers.
 * Les providers de plus haute priorité gagnent en cas de conflit de clé.
 */
export function collectProviderData(): Record<string, unknown> {
  const providers = getAIContextProviders();
  const result: Record<string, unknown> = {};

  // Les providers de plus basse priorité sont traités en premier
  // pour que les plus hauts puissent les écraser
  for (const provider of [...providers].reverse()) {
    try {
      const data = provider.provide();
      Object.assign(result, data);
    } catch (err) {
      console.warn(`[EGEN AI Context] Provider "${provider.id}" a échoué :`, err);
    }
  }

  return result;
}

/**
 * S'abonne aux changements du registre (ajout/suppression/mise à jour de provider).
 */
export function onProviderRegistryChange(callback: () => void): () => void {
  _changeListeners.add(callback);
  return () => _changeListeners.delete(callback);
}

/** @internal — pour les tests uniquement */
export function _clearProviderRegistry(): void {
  _registry.forEach((e) => e.unsubscribe?.());
  _registry.clear();
  _changeListeners.clear();
}

export function getProviderCount(): number {
  return _registry.size;
}
