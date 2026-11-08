import type { CapabilityName } from './types.js';

type CapabilityResolver = (capability: CapabilityName) => boolean;

let resolver: CapabilityResolver | null = null;

/**
 * Pose (ou retire, avec `null`) la fonction qui dit si une capacité de plateforme est disponible.
 * Appelée par `@egen-civitas/esm-platform` une fois le Host connu ; elle vit ici (couche la plus basse) pour que
 * `esm-routes` puisse filtrer les apps SANS dépendre d'`esm-platform`.
 *
 * @category Platform
 */
export function setCapabilityResolver(newResolver: CapabilityResolver | null): void {
  resolver = newResolver;
}

/**
 * `true` si la capacité est disponible. Tant qu'aucun résolveur n'est posé, AUCUNE capacité n'est considérée
 * disponible (on ne suppose jamais une capacité).
 *
 * @category Platform
 */
export function hasCapability(capability: CapabilityName): boolean {
  return resolver ? resolver(capability) : false;
}
