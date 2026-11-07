import { setCapabilityResolver } from '@egen-civitas/esm-globals';
import { createWebCapabilities } from './adapters/web/index.js';
import { assemblePlatform } from './capabilities.js';
import { getPlatformEnvironment, hasHostBridge } from './detect.js';
import { PlatformError } from './errors.js';
import type { Platform, PlatformEnvironment } from './types.js';

/**
 * Handshake avec le Host. En Web, rien à attendre. En natif, le Host DOIT avoir injecté `window.egenHostBridge` avant
 * tout script de la page (C5) : son absence est une incompatibilité (« Host manquant »), pas une panne passagère.
 * Le handshake de version et de capacités sera ajouté par le client de pont (C5).
 */
function waitForHost(environment: PlatformEnvironment): Promise<void> {
  if (environment === 'web' || hasHostBridge()) {
    return Promise.resolve();
  }
  return Promise.reject(
    new PlatformError(
      'INCOMPATIBLE',
      `Host manquant : la cible "${environment}" exige que l'application hôte injecte window.egenHostBridge avant le chargement de la page.`,
    ),
  );
}

/**
 * Point d'accès unique des apps aux capacités de plateforme.
 *
 * La cible est fixée au build (`window.egenTarget`). En Web, les capacités du navigateur sont fournies (adaptateur C4).
 * En natif, tant que le client de pont (C5) n'est pas branché, AUCUNE capacité n'est fournie : `has()` est faux
 * partout et chaque méthode rejette `UNAVAILABLE`. C'est le comportement sûr par défaut : rien n'est simulé.
 *
 * @category Platform
 */
export function getPlatform(): Platform {
  const environment = getPlatformEnvironment();
  return assemblePlatform({
    environment,
    // Web : capacités du navigateur (C4). Natif : aucune tant que le client de pont (C5) n'est pas branché.
    capabilities: environment === 'web' ? createWebCapabilities() : undefined,
    ready: () => waitForHost(environment),
  });
}

/**
 * Rend les capacités de la plateforme consultables par le reste du framework (filtrage `requiredCapabilities`
 * des apps, F2) et retourne `platform.ready`.
 *
 * À appeler UNE fois au démarrage, AVANT l'enregistrement des apps. Le résolveur est posé immédiatement : si `ready`
 * rejette (natif sans Host), `has()` reste faux partout — aucune capacité n'est jamais supposée.
 *
 * @category Platform
 */
export function registerPlatformCapabilities(platform: Platform = getPlatform()): Promise<void> {
  setCapabilityResolver((capability) => platform.has(capability));
  return platform.ready;
}
