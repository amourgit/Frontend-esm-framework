import { PlatformError } from '../../errors.js';
import type { CameraCapability } from '../../types.js';
import { pickFiles } from './pick-files.js';
import { registerWebFile } from './file-registry.js';

/**
 * `camera.capture` en Web : `<input type="file" accept="image/*" capture>`.
 *
 * CHOIX documenté (la doc C4 demande d'en retenir UN) : l'attribut `capture` plutôt que `getUserMedia`. Raisons :
 * pas de flux vidéo à gérer ni de permission préalable à orchestrer, et l'application de caméra du système est
 * employée sur mobile. Contrepartie : sur ordinateur, `capture` est ignoré et l'utilisateur obtient un sélecteur de
 * fichiers image (pas de prévisualisation intégrée).
 */
export function createWebCamera(): CameraCapability {
  return {
    async capture(options) {
      const facing = options?.facing;
      if (facing !== undefined && facing !== 'front' && facing !== 'back') {
        throw new PlatformError('INVALID_ARGS', '`facing` doit valoir "front" ou "back".', {
          capability: 'camera',
          method: 'capture',
        });
      }
      const [file] = await pickFiles({
        accept: ['image/*'],
        capture: facing === 'front' ? 'user' : 'environment',
        capability: 'camera',
        method: 'capture',
      });
      return registerWebFile(file);
    },
  };
}
