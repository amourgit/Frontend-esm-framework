import type { BridgeClient } from '../../bridge/client.js';
import type { SessionCapability } from '../../types.js';
import { invalidArgs, invalidHostResponse, isHeaderValue, isNonEmptyString, MAX_SECRET_LENGTH } from './validate.js';

const CAP = 'session';

/**
 * `session` natif : simple APPELANT du pont. Les jetons vivent dans le Host (Keychain / Keystore) ; le WebView ne
 * reçoit que la valeur de l'en-tête `Authorization` nécessaire à un appel API. Aucun jeton n'apparaît dans un message
 * d'erreur.
 */
export function createNativeSession(client: BridgeClient): SessionCapability {
  return {
    async getAuthorization() {
      const result = await client.call<unknown>(CAP, 'getAuthorization');
      if (result === null) {
        return null;
      }
      if (!isHeaderValue(result)) {
        throw invalidHostResponse(CAP, 'getAuthorization');
      }
      return result;
    },

    async setTokens(tokens) {
      const { access, refresh, expiresAt } = (tokens ?? {}) as Partial<typeof tokens>;
      if (!isNonEmptyString(access, MAX_SECRET_LENGTH)) {
        throw invalidArgs(CAP, 'setTokens', 'access doit être une chaîne non vide.');
      }
      if (refresh !== undefined && !isNonEmptyString(refresh, MAX_SECRET_LENGTH)) {
        throw invalidArgs(CAP, 'setTokens', 'refresh doit être une chaîne non vide.');
      }
      if (expiresAt !== undefined && !(typeof expiresAt === 'number' && Number.isFinite(expiresAt))) {
        throw invalidArgs(CAP, 'setTokens', 'expiresAt doit être un nombre fini.');
      }
      // Seuls les champs connus sont transmis (rien d'autre ne sort du WebView).
      await client.call(CAP, 'setTokens', {
        access,
        ...(refresh !== undefined ? { refresh } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      });
    },

    async refresh() {
      const result = await client.call<unknown>(CAP, 'refresh');
      if (typeof result !== 'boolean') {
        throw invalidHostResponse(CAP, 'refresh');
      }
      return result;
    },

    async clear() {
      await client.call(CAP, 'clear');
    },
  };
}
