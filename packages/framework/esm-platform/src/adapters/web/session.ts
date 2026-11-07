import { unavailable } from '../../errors.js';
import type { SessionCapability } from '../../types.js';

/**
 * `session` en Web : fournisseur d'autorisation VIDE. Le cookie de session reste le mécanisme d'authentification
 * (`egenFetch` n'ajoute aucun en-tête `Authorization`, cf. D1) : il n'y a donc pas de jeton à fournir, et on n'en
 * fabrique pas.
 *
 * - `getAuthorization` → `null` (« pas de jeton géré par le client ») ;
 * - `refresh` → `false` (aucun nouveau jeton) ;
 * - `clear` → no-op (rien n'est stocké côté client ; la déconnexion Web passe par le serveur) ;
 * - `setTokens` → `UNAVAILABLE` : stocker un jeton dans le navigateur serait un faux coffre (jamais simuler de sécurité).
 */
export function createWebSession(): SessionCapability {
  return {
    getAuthorization: () => Promise.resolve(null),
    refresh: () => Promise.resolve(false),
    clear: () => Promise.resolve(),
    setTokens: () => Promise.reject(unavailable('session', 'setTokens')),
  };
}
