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
