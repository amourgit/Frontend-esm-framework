import { unavailable } from '../../errors.js';
import type { FilesCapability } from '../../types.js';
import { pickFiles } from './pick-files.js';
import { registerWebFile } from './file-registry.js';

/**
 * `files` en Web : `select` utilise un `<input type="file">` éphémère. `download` n'est PAS fourni en Web en v1 :
 * l'attribut `download` d'un lien est ignoré hors même origine, et la capacité ne doit pas promettre ce qu'elle ne
 * garantit pas (`UNAVAILABLE`, comme les autres méthodes non fournies).
 */
export function createWebFiles(): Partial<FilesCapability> {
  return {
    async select(options) {
      const selected = await pickFiles({
        multiple: options?.multiple,
        accept: options?.accept,
        capability: 'files',
        method: 'select',
      });
      return selected.map(registerWebFile);
    },
    download: () => Promise.reject(unavailable('files', 'download')),
  };
}
