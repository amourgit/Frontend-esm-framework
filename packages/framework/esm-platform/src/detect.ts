import { getEgenTarget, isNativeTarget } from '@egen-civitas/esm-globals';
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
 * `true` si le Host a injecté un pont conforme au contrat (`window.egenHostBridge = { send, subscribe }`, tâche C5).
 * Ne vérifie que la FORME du pont : le handshake (version, capacités) est fait par le client de pont (C5).
 * Jamais de détection par User-Agent ni par bibliothèque d'enveloppe (N4).
 *
 * @category Platform
 */
export function hasHostBridge(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const bridge = (window as { egenHostBridge?: unknown }).egenHostBridge as
    { send?: unknown; subscribe?: unknown } | null | undefined;
  return !!bridge && typeof bridge.send === 'function' && typeof bridge.subscribe === 'function';
}
