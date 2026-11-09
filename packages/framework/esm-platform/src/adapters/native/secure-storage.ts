import type { BridgeClient } from '../../bridge/client.js';
import type { SecureStorageCapability } from '../../types.js';
import { invalidArgs, invalidHostResponse, isNonEmptyString, MAX_STORAGE_KEY_LENGTH } from './validate.js';

const CAP = 'secureStorage';

/** `secureStorage` natif : coffre du Host (Keychain / Keystore). Valeurs `string` uniquement, aucune sérialisation implicite. */
export function createNativeSecureStorage(client: BridgeClient): SecureStorageCapability {
  const assertKey = (method: string, key: unknown): string => {
    if (!isNonEmptyString(key, MAX_STORAGE_KEY_LENGTH)) {
      throw invalidArgs(CAP, method, `key doit être une chaîne de 1 à ${MAX_STORAGE_KEY_LENGTH} caractères.`);
    }
    return key;
  };

  return {
    async get(key) {
      const result = await client.call<unknown>(CAP, 'get', { key: assertKey('get', key) });
      if (result !== null && typeof result !== 'string') {
        throw invalidHostResponse(CAP, 'get');
      }
      return result;
    },

    async set(key, value) {
      const validKey = assertKey('set', key);
      if (typeof value !== 'string') {
        throw invalidArgs(CAP, 'set', 'value doit être une chaîne (aucune sérialisation implicite).');
      }
      await client.call(CAP, 'set', { key: validKey, value });
    },

    async remove(key) {
      await client.call(CAP, 'remove', { key: assertKey('remove', key) });
    },
  };
}
