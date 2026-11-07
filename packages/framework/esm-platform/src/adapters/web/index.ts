import type { CapabilityOverrides } from '../../capabilities.js';
import { createWebCamera } from './camera.js';
import { createWebFiles } from './files.js';
import { createWebLifecycle } from './lifecycle.js';
import { createWebOpenExternal } from './open-external.js';
import { createWebPermissions, isWebPermissionsAvailable } from './permissions.js';
import { createWebSession } from './session.js';

/**
 * Capacités fournies par le navigateur. PRINCIPE (doc C4) : ne jamais simuler de la sécurité. Sont donc ABSENTES
 * (`has()` faux, méthodes `UNAVAILABLE`) : `secureStorage` (pas de faux coffre dans `localStorage`), `push` et
 * `biometric` (v1), ainsi que `permissions` quand l'API Permissions n'existe pas.
 */
export function createWebCapabilities(): CapabilityOverrides {
  const capabilities: CapabilityOverrides = {
    session: createWebSession(),
    openExternal: createWebOpenExternal(),
    lifecycle: createWebLifecycle(),
    files: createWebFiles(),
    camera: createWebCamera(),
  };
  if (isWebPermissionsAvailable()) {
    capabilities.permissions = createWebPermissions();
  }
  return capabilities;
}
