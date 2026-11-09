import type { BridgeClient } from '../../bridge/client.js';
import type { OpenExternalCapability } from '../../types.js';
import { assertExternalUrl } from '../web/open-external.js';

/**
 * `openExternal` natif. La liste blanche de schémas est appliquée ICI, côté Shell (la même qu'en Web), avant tout
 * envoi : une URL `javascript:` / `data:` / `file:` ne part jamais vers le Host. Le Host la revalide de son côté.
 */
export function createNativeOpenExternal(client: BridgeClient): OpenExternalCapability {
  return {
    async open(url) {
      await client.call('openExternal', 'open', { url: assertExternalUrl(url) });
    },
  };
}
