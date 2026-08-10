import type { EgenAppRoutes, EgenRoutes } from './types';

/**
 * Simple type-predicate to ensure that the value can be treated as an EgenAppRoutes
 * object.
 *
 * @param routes the object to check to see if it is an EgenAppRoutes object
 * @returns true if the routes value is an EgenAppRoutes
 */
export function isEgenAppRoutes(routes: EgenAppRoutes | unknown): routes is EgenAppRoutes {
  if (routes && typeof routes === 'object') {
    const maybeRoutes = routes as EgenAppRoutes;

    if (Object.hasOwn(routes, 'pages')) {
      if (!Boolean(maybeRoutes.pages) || !Array.isArray(maybeRoutes.pages)) {
        return false;
      }
    }

    if (Object.hasOwn(routes, 'extensions')) {
      if (!Boolean(maybeRoutes.extensions) || !Array.isArray(maybeRoutes.extensions)) {
        return false;
      }
    }

    if (Object.hasOwn(routes, 'workspaces')) {
      if (!Boolean(maybeRoutes.workspaces) || !Array.isArray(maybeRoutes.workspaces)) {
        return false;
      }
    }

    if (Object.hasOwn(routes, 'modals')) {
      if (!Boolean(maybeRoutes.modals) || !Array.isArray(maybeRoutes.modals)) {
        return false;
      }
    }

    // A completely empty object is a valid EgenAppRoutes object.
    return true;
  }

  return false;
}

/**
 * Simple type-predicate to ensure that the value can be treated as an EgenRoutes
 * object.
 *
 * @param routes the object to check to see if it is an EgenRoutes object
 * @returns true if the routes value is an EgenRoutes
 */
export function isEgenRoutes(routes: EgenRoutes | unknown): routes is EgenRoutes {
  if (routes && typeof routes === 'object') {
    const maybeRoutes = routes as EgenRoutes;

    return Object.entries(maybeRoutes).every(([key, value]) => typeof key === 'string' && isEgenAppRoutes(value));
  }

  return false;
}
