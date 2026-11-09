import { setCapabilityResolver } from '@egen-civitas/esm-globals';
import { assemblePlatform } from './capabilities.js';
import { getHostBridge, getPlatformEnvironment } from './detect.js';
import { PlatformError } from './errors.js';
import { createNativeCapabilities, getNativeClient } from './native.js';
import { createWebCapabilities, isHostVersionSufficient } from './registry.js';
import type { Platform, PlatformEnvironment } from './types.js';

function hostMissing(environment: PlatformEnvironment): PlatformError {
  return new PlatformError(
    'INCOMPATIBLE',
    `Host manquant : la cible "${environment}" exige que l'application hôte injecte window.egenHostBridge avant le chargement de la page.`,
  );
}

/**
 * Point d'accès unique des apps aux capacités de plateforme.
 *
 * La cible est fixée au build (`window.egenTarget`).
 * - Web : capacités du navigateur (adaptateur C4), rien à attendre.
 * - Natif : le Host DOIT avoir injecté `window.egenHostBridge` avant tout script de la page, sinon `ready` rejette
 *   `INCOMPATIBLE` (« Host manquant »). `ready` est le handshake de protocole (version, plateforme, capacités). Une
 *   capacité n'est disponible que si le Host l'annonce ET que le framework sait l'appeler : tant que les adaptateurs
 *   natifs (C7) ne sont pas écrits, `has()` est faux partout et chaque méthode rejette `UNAVAILABLE`.
 *
 * @category Platform
 */
export function getPlatform(): Platform {
  const environment = getPlatformEnvironment();

  if (environment === 'web') {
    return assemblePlatform({
      environment,
      capabilities: createWebCapabilities(),
      ready: () => Promise.resolve(),
    });
  }

  const bridge = getHostBridge();
  if (!bridge) {
    return assemblePlatform({ environment, ready: () => Promise.reject(hostMissing(environment)) });
  }

  const client = getNativeClient(bridge, environment);
  return assemblePlatform({
    environment,
    capabilities: createNativeCapabilities(client),
    ready: () => client.hello().then(() => undefined),
    // Annoncée par le Host ET dans une version suffisante pour l'adaptateur de ce framework (registre).
    available: (capability) => isHostVersionSufficient(capability, client.hostInfo?.capabilities[capability]?.v),
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
