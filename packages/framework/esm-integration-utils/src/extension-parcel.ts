import { type ExtensionData, renderExtension } from '@egen-civitas/esm-extensions';
import type { Parcel } from 'single-spa';

export interface ExtensionMount {
  /** Transmet un nouvel état à l'extension montée. */
  update(state?: Record<string, unknown>): Promise<void>;
  /** Démonte l'extension (gère les états transitoires MOUNTING / UPDATING). */
  unmount(): void;
}

/**
 * Monte, dans `node`, l'extension décrite par `extension` (parcel Single-SPA).
 * Équivalent neutre du composant `Extension` de esm-react-utils : mêmes appels, même gestion
 * des états transitoires.
 */
export function mountExtension(node: HTMLElement, extension: ExtensionData, state?: Record<string, unknown>): ExtensionMount {
  let parcel: Parcel | null = null;
  let updating: Promise<void> = Promise.resolve();
  const ready = renderExtension(
    node,
    extension.extensionSlotName,
    extension.extensionSlotModuleName,
    extension.extensionId,
    undefined,
    state,
  ).then((p: Parcel | null) => {
    parcel = p;
  });

  return {
    update(next) {
      return ready.then(() => {
        const p = parcel;
        if (p && p.update && p.getStatus() !== 'UNMOUNTING') {
          return Promise.all([p.mountPromise, updating]).then(() => {
            if (parcel?.getStatus() === 'MOUNTED' && parcel.update) {
              updating = parcel.update({ ...next }).catch((err) => {
                // composant démonté pendant la mise à jour : erreur ignorée
                if (!(err instanceof Error) || !err.message.includes('minified message #32') || parcel?.getStatus() === 'MOUNTED') {
                  throw err;
                }
              });
              return updating;
            }
          });
        }
      });
    },
    unmount() {
      const p = parcel;
      if (!p) return;
      switch (p.getStatus()) {
        case 'MOUNTING':
          p.mountPromise.then(() => {
            if (p.getStatus() === 'MOUNTED') p.unmount();
          });
          break;
        case 'MOUNTED':
          p.unmount();
          break;
        case 'UPDATING':
          updating.then(() => {
            if (p.getStatus() === 'MOUNTED') p.unmount();
          });
      }
    },
  };
}
