import type { BridgeClient } from './bridge/client.js';
import { createWebCamera } from './adapters/web/camera.js';
import { createWebFiles } from './adapters/web/files.js';
import { createWebLifecycle } from './adapters/web/lifecycle.js';
import { createWebOpenExternal } from './adapters/web/open-external.js';
import { createWebPermissions, isWebPermissionsAvailable } from './adapters/web/permissions.js';
import { createWebSession } from './adapters/web/session.js';
import type { CapabilityInterfaces } from './types.js';

/**
 * Registre des capacités : POINT UNIQUE qui décrit chacune d'elles (tâche C6). Tout ce qui énumère des capacités
 * (gabarit « indisponible », handshake avec le Host, adaptateurs Web et natif, mocks) le lit ici au lieu de tenir sa
 * propre liste. Voir la procédure « ajouter une capacité » dans le README du package.
 */

/**
 * `async` : méthode qui retourne une `Promise` (absente ⇒ rejette `UNAVAILABLE`).
 * `subscribe` : abonnement synchrone qui retourne une fonction de désabonnement (absent ⇒ lève `UNAVAILABLE`,
 * faute de pouvoir rejeter).
 */
export type MethodKind = 'async' | 'subscribe';

export interface CapabilityDefinition<T = Record<string, unknown>> {
  /**
   * Version de la capacité implémentée par ce framework. Le Host annonce la sienne au handshake (`{ v }`) : une
   * capacité n'est disponible que si `v` du Host ≥ cette version.
   */
  version: number;
  /** Toutes les méthodes publiques de la capacité. Exhaustif à la compilation : un oubli ne compile pas. */
  methods: { [M in keyof T]: MethodKind };
  /**
   * Adaptateur Web : fabrique appelée à chaque `getPlatform()`. Retourne `undefined` si le navigateur ne la supporte
   * pas (la capacité reste alors absente). Ne retourne jamais de simulation de sécurité.
   */
  web?: () => Partial<T> | undefined;
  /** Adaptateur natif : simple APPELANT du pont (aucune logique métier), branché sur le client du Host. */
  native?: (client: BridgeClient) => Partial<T> | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const definitions = new Map<string, CapabilityDefinition<any>>();

/**
 * Enregistre (ou remplace) une capacité. Les 9 capacités de la v1 sont enregistrées plus bas ; une capacité ajoutée
 * ensuite passe par ici, depuis son propre fichier.
 */
export function registerCapability<K extends keyof CapabilityInterfaces>(
  name: K,
  definition: CapabilityDefinition<CapabilityInterfaces[K]>,
): void {
  definitions.set(name, definition);
}

/** Retire une capacité du registre (réservé aux tests qui en ajoutent une fictive). */
export function unregisterCapability(name: string): boolean {
  return definitions.delete(name);
}

export function getCapabilityDefinition(name: string): CapabilityDefinition | undefined {
  return definitions.get(name);
}

export function listCapabilityNames(): string[] {
  return [...definitions.keys()];
}

/** Le nom est-il celui d'une capacité connue de ce framework ? (un Host peut en annoncer d'autres : elles sont ignorées) */
export function isKnownCapability(name: string): boolean {
  return definitions.has(name);
}

/** Le Host annonce-t-il une version suffisante de cette capacité ? */
export function isHostVersionSufficient(name: string, hostVersion: number | undefined): boolean {
  const definition = definitions.get(name);
  return definition !== undefined && hostVersion !== undefined && hostVersion >= definition.version;
}

/** Adaptateurs Web de toutes les capacités du registre dont le navigateur est capable. */
export function createWebCapabilities(): Partial<{
  [K in keyof CapabilityInterfaces]: Partial<CapabilityInterfaces[K]>;
}> {
  const capabilities: Record<string, unknown> = {};
  for (const [name, definition] of definitions) {
    const adapter = definition.web?.();
    if (adapter) {
      capabilities[name] = adapter;
    }
  }
  return capabilities;
}

/** Adaptateurs natifs de toutes les capacités du registre, branchés sur le client de pont. */
export function createNativeCapabilitiesFromRegistry(
  client: BridgeClient,
): Partial<{ [K in keyof CapabilityInterfaces]: Partial<CapabilityInterfaces[K]> }> {
  const capabilities: Record<string, unknown> = {};
  for (const [name, definition] of definitions) {
    const adapter = definition.native?.(client);
    if (adapter) {
      capabilities[name] = adapter;
    }
  }
  return capabilities;
}

// ── Capacités v1 ─────────────────────────────────────────────────────────────────────────────
// Les adaptateurs natifs (`native`) sont l'objet de la tâche C7 (une capacité à la fois, quand une app l'utilise, N9).

registerCapability('session', {
  version: 1,
  methods: { getAuthorization: 'async', setTokens: 'async', refresh: 'async', clear: 'async' },
  web: createWebSession,
});

registerCapability('secureStorage', {
  version: 1,
  methods: { get: 'async', set: 'async', remove: 'async' },
  // Pas d'adaptateur Web : jamais de faux coffre dans le navigateur.
});

registerCapability('openExternal', {
  version: 1,
  methods: { open: 'async' },
  web: createWebOpenExternal,
});

registerCapability('lifecycle', {
  version: 1,
  methods: { onResume: 'subscribe', onPause: 'subscribe' },
  web: createWebLifecycle,
});

registerCapability('permissions', {
  version: 1,
  methods: { check: 'async', request: 'async' },
  web: () => (isWebPermissionsAvailable() ? createWebPermissions() : undefined),
});

registerCapability('files', {
  version: 1,
  methods: { select: 'async', download: 'async' },
  web: createWebFiles,
});

registerCapability('camera', {
  version: 1,
  methods: { capture: 'async' },
  web: createWebCamera,
});

registerCapability('push', {
  version: 1,
  methods: { register: 'async', onMessage: 'subscribe' },
});

registerCapability('biometric', {
  version: 1,
  methods: { isAvailable: 'async', authenticate: 'async' },
});
