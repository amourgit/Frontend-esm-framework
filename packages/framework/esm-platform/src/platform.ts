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
 * La cible est fixée au build (`window.egenTarget`). Tant qu'aucun adaptateur n'est branché (C4 pour le Web, C5 pour le
 * natif), AUCUNE capacité n'est fournie : `has()` est faux partout et chaque méthode rejette `UNAVAILABLE`. C'est le
 * comportement sûr par défaut : rien n'est simulé.
 *
 * @category Platform
 */
export function getPlatform(): Platform {
  const environment = getPlatformEnvironment();
  return assemblePlatform({ environment, ready: () => waitForHost(environment) });
}
