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
    refetchCurrentUser();
  }
}
