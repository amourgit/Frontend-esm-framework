import { assemblePlatform, type CapabilityOverrides } from '../capabilities.js';
import type { Platform, PlatformEnvironment } from '../types.js';

export interface MockPlatformOptions {
  /** @default 'web' */
  environment?: PlatformEnvironment;
  /**
   * Capacités simulées. Seules celles listées sont « disponibles » (`has()` vrai) ; les méthodes non fournies
   * d'une capacité listée, et toutes les autres capacités, rejettent `UNAVAILABLE` comme en production.
   */
  capabilities?: CapabilityOverrides;
  /** @default Promise.resolve() */
  ready?: Promise<void>;
}

/**
 * `Platform` de test, SANS Host. Construit par le même assembleur que `getPlatform()` : le mock ne peut pas diverger
 * du contrat (même `has()`, mêmes rejets `UNAVAILABLE`).
 *
 * `createMockHost()` (simulation de `window.egenHostBridge`) viendra avec le client de pont (C5, tâche C9).
 *
 * @category Platform
 */
export function createMockPlatform(options: MockPlatformOptions = {}): Platform {
  const { environment = 'web', capabilities, ready = Promise.resolve() } = options;
  return assemblePlatform({ environment, capabilities, ready: () => ready });
}
