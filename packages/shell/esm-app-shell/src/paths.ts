import type { SpaConfig } from '@egen-civitas/esm-framework/src/internal';

function _createSpaBase(baseUrl: string) {
  return () => baseUrl;
}

/**
 * Pose les chemins globaux du shell (`egenBase`, `spaBase`, `spaEnv`, `spaVersion`, `getEgenSpaBase`), en lecture seule.
 *
 * Cible native (B6) : `spaPath` vaut `/app` (constant) et `apiUrl` est **absolue** (`https://…`) car l'origine du WebView
 * n'est pas celle de l'API ; Web : `apiUrl` relative (`/egen`), même origine. `target` ne sert qu'aux tests.
 */
export function setupPaths(config: SpaConfig, target: Window = window) {
  let error = false;
  if (!config.apiUrl) {
    console.error(
      'initializeSpa() was called without supplying an apiUrl. This means that the application cannot communicate with the backend.',
    );
    error = true;
  }

  if (!config.spaPath) {
    console.error(
      'initializeSpa() was called without supplying a spaPath. This means that the application cannot properly generate urls.',
    );
    error = true;
  }

  if (error) {
    throw new Error(
      'One or more required properties in the basic configuration of the application was missing and the application cannot be rendered. Please see the browser console for details.',
    );
  }

  // Object.defineProperty used to make these read-only
  Object.defineProperty(target, 'egenBase', {
    value: config.apiUrl,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(target, 'spaBase', {
    value: config.spaPath,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(target, 'spaEnv', {
    value: config.env || 'production',
    writable: false,
    configurable: false,
  });
  Object.defineProperty(target, 'spaVersion', {
    value: process.env.BUILD_VERSION ?? 'local',
    writable: false,
    configurable: false,
  });

  const spaBaseWithSlash = target.spaBase.endsWith('/') ? target.spaBase : target.spaBase + '/';
  Object.defineProperty(target, 'getEgenSpaBase', {
    value: _createSpaBase(spaBaseWithSlash),
    writable: false,
    configurable: false,
  });
}

/**
 * URL absolue d'un chemin d'API (`/ws/rest/v1/session`…) : sans origine propre, une base d'API absolue est conservée
 * telle quelle ; une base relative (Web) est résolue contre l'origine de la page.
 */
export function resolveApiUrl(path: string, egenBase: string = window.egenBase, origin: string = window.location.origin) {
  return new URL(`${egenBase}${path}`, origin).href;
}
