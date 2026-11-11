import { getEgenTarget, hasCapability, type CapabilityName, type EgenAppRoutes } from '@egen-civitas/esm-globals';
import { isVersionSatisfied } from '@egen-civitas/esm-utils';

// Ce package n'a pas les types Node : on déclare seulement ce que lit `currentFrameworkVersion()` (remplacé par le shell).
declare const process: { env: Record<string, string | undefined> };

export type AppUnavailability =
  | { reason: 'platform'; target: string; platforms: Array<string> }
  | { reason: 'framework'; required: string; current: string }
  | { reason: 'capability'; missing: Array<CapabilityName> };

/**
 * Dit pourquoi une app NE DOIT PAS être enregistrée dans l'environnement courant, ou `null` si elle le peut.
 * Champs absents = comportement historique (toutes plateformes, aucune capacité requise).
 */
/**
 * Version du framework du shell, inlinée à la compilation par le DefinePlugin du shell (`process.env.FRAMEWORK_VERSION`).
 * Hors bundle (tests, outils) elle est indisponible : la compatibilité n'est alors pas vérifiée.
 */
function currentFrameworkVersion(): string | undefined {
  try {
    return process.env.FRAMEWORK_VERSION || undefined;
  } catch {
    return undefined;
  }
}

export function getAppUnavailability(
  routes: EgenAppRoutes,
  frameworkVersion: string | undefined = currentFrameworkVersion(),
): AppUnavailability | null {
  const { platforms, requiredCapabilities, frameworkRange } = routes;

  if (Array.isArray(platforms) && platforms.length > 0) {
    const target = getEgenTarget();
    if (!platforms.includes(target)) {
      return { reason: 'platform', target, platforms: [...platforms] };
    }
  }

  // Compatibilité vérifiable (F4) : MF tourne avec `strictVersion: false`, une app incompatible s'exécuterait quand même
  // « de travers ». Absente = ancien format, toléré. Plage illisible ⇒ app écartée (échec fermé, visible dans le journal).
  if (typeof frameworkRange === 'string' && frameworkRange.length > 0 && frameworkVersion) {
    if (!isVersionSatisfied(frameworkRange, frameworkVersion)) {
      return { reason: 'framework', required: frameworkRange, current: frameworkVersion };
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
