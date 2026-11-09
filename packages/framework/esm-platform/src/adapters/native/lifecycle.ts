import type { BridgeClient } from '../../bridge/client.js';
import type { LifecycleCapability } from '../../types.js';
import { invalidArgs } from './validate.js';

function subscribe(client: BridgeClient, method: 'onResume' | 'onPause', event: string, callback: unknown) {
  if (typeof callback !== 'function') {
    throw invalidArgs('lifecycle', method, 'callback doit être une fonction.');
  }
  // Le Host pousse `lifecycle.resume` / `lifecycle.pause` ; aucun aller-retour n'est nécessaire.
  return client.onEvent(event, () => (callback as () => void)());
}

/** `lifecycle` natif : événements `lifecycle.resume` et `lifecycle.pause` émis par le Host (reprise / mise en arrière-plan). */
export function createNativeLifecycle(client: BridgeClient): LifecycleCapability {
  return {
    onResume: (callback) => subscribe(client, 'onResume', 'lifecycle.resume', callback),
    onPause: (callback) => subscribe(client, 'onPause', 'lifecycle.pause', callback),
  };
}
