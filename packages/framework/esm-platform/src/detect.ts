import { getEgenTarget, isNativeTarget } from '@egen-civitas/esm-globals';
import type { HostBridge } from './bridge/protocol.js';
import type { PlatformEnvironment } from './types.js';

/**
 * Environnement d'exécution courant. Source UNIQUE : `window.egenTarget`, posé au build.
 * Jamais de sniffing de User-Agent ni de détection de bibliothèque (règle N4).
 *
 * @category Platform
 */
export function getPlatformEnvironment(): PlatformEnvironment {
  return getEgenTarget();
}

/** `true` en Android/iOS. */
export function isNativePlatform(): boolean {
  return isNativeTarget();
}

/**
 * Le pont injecté par le Host (`window.egenHostBridge = { send, subscribe }`), ou `null` s'il est absent ou non
 * conforme. Ne vérifie que la FORME du pont : le handshake (version, capacités) est fait par le client de pont.
 * Jamais de détection par User-Agent ni par bibliothèque d'enveloppe (N4).
 *
 * @category Platform
 */
export function getHostBridge(): HostBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const bridge = (window as { egenHostBridge?: unknown }).egenHostBridge as
    { send?: unknown; subscribe?: unknown } | null | undefined;
  return bridge && typeof bridge.send === 'function' && typeof bridge.subscribe === 'function'
    ? (bridge as unknown as HostBridge)
    : null;
}

/**
 * `true` si le Host a injecté un pont conforme au contrat.
 *
 * @category Platform
 */
export function hasHostBridge(): boolean {
  return getHostBridge() !== null;
}
