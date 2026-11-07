import { PlatformError } from '../../errors.js';
import type { LifecycleCapability, Unsubscribe } from '../../types.js';

function subscribe(state: 'visible' | 'hidden', method: string, callback: () => void): Unsubscribe {
  if (typeof callback !== 'function') {
    throw new PlatformError('INVALID_ARGS', 'Le callback doit être une fonction.', { capability: 'lifecycle', method });
  }
  const listener = () => {
    if (document.visibilityState === state) {
      callback();
    }
  };
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

/** `lifecycle` en Web : `visibilitychange` → `onResume` (page visible) / `onPause` (page masquée). */
export function createWebLifecycle(): LifecycleCapability {
  return {
    onResume: (callback) => subscribe('visible', 'onResume', callback),
    onPause: (callback) => subscribe('hidden', 'onPause', callback),
  };
}
