import { defineConfigSchema } from '@egen-civitas/esm-config';
import { refetchCurrentUser } from './current-user.js';
import { configSchema } from './config-schema.js';
import { isDevAuthBypassEnabled } from './dev-auth-bypass.js';

/**
 * @internal
 */
export function setupApiModule() {
  defineConfigSchema('@egen-civitas/esm-api', configSchema);

  // Skipper l'appel réseau si le bypass d'authentification est activé
  if (!isDevAuthBypassEnabled()) {
    // handleSessionResponse() rejette volontairement même quand sessionStore a
    // déjà été mis à jour correctement (état "unauthenticated" en cas d'échec) —
    // voir les commentaires dans current-user.ts. Sans ce .catch(), un backend
    // injoignable au tout premier démarrage produit un rejet de promesse non
    // intercepté à chaque tentative, avant même que le composant applicatif
    // n'ait la moindre chance de s'abonner. Même traitement que les deux
    // autres appels de refetchCurrentUser() dans current-user.ts.
    refetchCurrentUser().catch(() => {});
  }
}
