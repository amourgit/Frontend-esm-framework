import { defineConfigSchema } from '@egen/esm-config';
import { refetchCurrentUser } from './current-user';
import { configSchema } from './config-schema';
import { isDevAuthBypassEnabled } from './dev-auth-bypass';

/**
 * @internal
 */
export function setupApiModule() {
  defineConfigSchema('@egen/esm-api', configSchema);

  // Skipper l'appel réseau si le bypass d'authentification est activé
  if (!isDevAuthBypassEnabled()) {
    refetchCurrentUser();
  }
}
