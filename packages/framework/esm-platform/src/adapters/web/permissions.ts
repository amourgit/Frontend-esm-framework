import { PlatformError, unavailable } from '../../errors.js';
import type { PermissionName, PermissionsCapability } from '../../types.js';

/** Le type `PermissionName` du DOM, que `types.ts` masque par le nôtre. */
type BrowserPermissionName = Parameters<Permissions['query']>[0]['name'];

const NAMES: readonly PermissionName[] = ['camera', 'microphone', 'notifications', 'files'];

function assertName(name: unknown, method: string): PermissionName {
  if (!NAMES.includes(name as PermissionName)) {
    throw new PlatformError('INVALID_ARGS', `Permission inconnue. Valeurs acceptées : ${NAMES.join(', ')}.`, {
      capability: 'permissions',
      method,
    });
  }
  return name as PermissionName;
}

/** L'API Permissions du navigateur est-elle disponible ? Sinon la capacité n'est pas fournie (`has()` faux). */
export function isWebPermissionsAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.permissions?.query === 'function';
}

/**
 * `permissions` en Web, via l'API Permissions du navigateur.
 *
 * - `check` : `navigator.permissions.query`. `files` n'a pas d'équivalent Web, et un navigateur qui ne connaît pas un
 *   nom (ex. `camera` sous Firefox) lève : dans les deux cas `UNAVAILABLE`, jamais une valeur inventée.
 * - `request` : seule `notifications` a une demande explicite en Web (`Notification.requestPermission`). Pour
 *   `camera` et `microphone`, le navigateur demande l'accès au moment de l'usage : `UNAVAILABLE` (rien n'est simulé).
 */
export function createWebPermissions(): Partial<PermissionsCapability> {
  return {
    async check(name) {
      const permission = assertName(name, 'check');
      if (permission === 'files') {
        throw unavailable('permissions', 'check');
      }
      try {
        const status = await navigator.permissions.query({ name: permission as BrowserPermissionName });
        return status.state;
      } catch {
        throw unavailable('permissions', 'check');
      }
    },
    async request(name) {
      const permission = assertName(name, 'request');
      if (permission !== 'notifications' || typeof Notification === 'undefined') {
        throw unavailable('permissions', 'request');
      }
      // « default » (fenêtre fermée sans choix) n'est pas un octroi.
      return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
    },
  };
}
