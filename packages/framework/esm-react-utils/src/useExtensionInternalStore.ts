import type { ExtensionInternalStore } from '@egen-civitas/esm-extensions';
import { getExtensionInternalStore } from '@egen-civitas/esm-extensions';
import { createUseStore } from './useStore.js';

/** @internal
 * @deprecated Use `useStore(getExtensionInternalStore())`
 */
export const useExtensionInternalStore = createUseStore<ExtensionInternalStore>(getExtensionInternalStore());
