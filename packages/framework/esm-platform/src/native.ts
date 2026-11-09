import { createBridgeClient, type BridgeClient, type HostInfo } from './bridge/client.js';
import type { HostBridge } from './bridge/protocol.js';
import type { CapabilityOverrides } from './capabilities.js';
import { getHostBridge } from './detect.js';
import { createNativeCapabilitiesFromRegistry } from './registry.js';
import type { PlatformEnvironment } from './types.js';

/** Un client de pont par pont : ses abonnements et son handshake sont partagés par tous les `getPlatform()` de la page. */
const clients = new WeakMap<HostBridge, BridgeClient>();

function frameworkVersion(): string | undefined {
  try {
    // Remplacé à la compilation par le DefinePlugin du shell ; absent (ReferenceError) hors bundle.
    return process.env.FRAMEWORK_VERSION || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Client du pont donné. `getPlatform()` est appelé plusieurs fois (démarrage, apps) : sans ce partage, chaque appel
 * referait un `subscribe` et un handshake. Un seul client par pont ⇒ un seul handshake (`hello()` est mémorisé : une
 * incompatibilité reste rejetée, un échec passager comme un timeout peut être rejoué).
 */
export function getNativeClient(bridge: HostBridge, environment: PlatformEnvironment): BridgeClient {
  let client = clients.get(bridge);
  if (!client) {
    client = createBridgeClient({ bridge, environment, framework: frameworkVersion() });
    clients.set(bridge, client);
  }
  return client;
}

/**
 * Capacités natives implémentées par le framework, branchées sur le client de pont : celles dont l'entrée du registre
 * (`registry.ts`) déclare un adaptateur `native`. AUCUNE tant que les adaptateurs natifs (tâche C7) ne sont pas écrits :
 * `has()` reste faux partout, même si le Host annonce la capacité — on ne promet jamais ce que le framework ne sait
 * pas encore appeler.
 */
export function createNativeCapabilities(client: BridgeClient): CapabilityOverrides {
  return createNativeCapabilitiesFromRegistry(client);
}

/**
 * Ce que le Host a annoncé au handshake (version de protocole, version du Host, capacités), ou `null` si le
 * handshake n'a pas (encore) réussi. Utile au diagnostic et à la validation de compatibilité.
 *
 * @category Platform
 */
export function getHostInfo(): HostInfo | null {
  const bridge = getHostBridge();
  return bridge ? (clients.get(bridge)?.hostInfo ?? null) : null;
}
