import { getEgenTarget, hasCapability, type CapabilityName, type EgenAppRoutes } from '@egen-civitas/esm-globals';

export type AppUnavailability =
  | { reason: 'platform'; target: string; platforms: Array<string> }
  | { reason: 'capability'; missing: Array<CapabilityName> };

/**
 * Dit pourquoi une app NE DOIT PAS être enregistrée dans l'environnement courant, ou `null` si elle le peut.
 * Champs absents = comportement historique (toutes plateformes, aucune capacité requise).
 */
export function getAppUnavailability(routes: EgenAppRoutes): AppUnavailability | null {
  const { platforms, requiredCapabilities } = routes;

  if (Array.isArray(platforms) && platforms.length > 0) {
    const target = getEgenTarget();
    if (!platforms.includes(target)) {
      return { reason: 'platform', target, platforms: [...platforms] };
    }
  }

  if (Array.isArray(requiredCapabilities) && requiredCapabilities.length > 0) {
    const missing = requiredCapabilities.filter((capability) => !hasCapability(capability));
    if (missing.length > 0) {
      return { reason: 'capability', missing };
    }
  }

  return null;
}
