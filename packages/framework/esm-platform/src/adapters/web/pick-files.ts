import { PlatformError } from '../../errors.js';

export interface PickFilesOptions {
  multiple?: boolean;
  accept?: string[];
  /** Valeur de l'attribut `capture` (`user` = caméra frontale, `environment` = caméra arrière). */
  capture?: 'user' | 'environment';
  capability: string;
  method: string;
}

/** Types MIME ou extensions : `image/*`, `application/pdf`, `.csv`. Rien d'autre n'est écrit dans l'attribut `accept`. */
const ACCEPT_ENTRY = /^(\.[A-Za-z0-9]+|[A-Za-z0-9!#$&^_.+-]+\/(\*|[A-Za-z0-9!#$&^_.+-]+))$/;

/**
 * Ouvre le sélecteur de fichiers du navigateur via un `<input type="file">` ÉPHÉMÈRE (créé, utilisé, retiré).
 * Doit être appelé depuis un geste utilisateur, sans quoi le navigateur ignore `click()`.
 *
 * Annulation : l'événement `cancel` (navigateurs récents) rejette `CANCELLED`. Sur un navigateur qui ne l'émet pas,
 * la promesse reste en attente tant que l'utilisateur ne choisit rien : c'est une limite connue, non contournable
 * proprement sans deviner (pas d'heuristique sur le focus).
 */
export function pickFiles({
  multiple = false,
  accept,
  capture,
  capability,
  method,
}: PickFilesOptions): Promise<File[]> {
  if (accept !== undefined && (!Array.isArray(accept) || !accept.every((entry) => ACCEPT_ENTRY.test(String(entry))))) {
    return Promise.reject(
      new PlatformError(
        'INVALID_ARGS',
        '`accept` doit être une liste de types MIME ou d’extensions (ex. "image/*", ".csv").',
        {
          capability,
          method,
        },
      ),
    );
  }

  return new Promise<File[]>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    if (accept && accept.length > 0) {
      input.accept = accept.join(',');
    }
    if (capture) {
      input.setAttribute('capture', capture);
    }
    // Certains navigateurs mobiles exigent l'élément dans le document pour déclencher le sélecteur.
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => input.remove();
    input.addEventListener(
      'change',
      () => {
        const selected = Array.from(input.files ?? []);
        cleanup();
        if (selected.length === 0) {
          reject(new PlatformError('CANCELLED', 'Aucun fichier sélectionné.', { capability, method }));
        } else {
          resolve(selected);
        }
      },
      { once: true },
    );
    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        reject(new PlatformError('CANCELLED', 'Sélection annulée.', { capability, method }));
      },
      { once: true },
    );
    input.click();
  });
}
