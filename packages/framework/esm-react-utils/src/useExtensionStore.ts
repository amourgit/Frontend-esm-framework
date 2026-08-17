/** @module @category Extension */
import { type ExtensionStore, getExtensionStore } from '@egen-civitas/esm-extensions';
import { createUseStore } from './useStore.js';

export const useExtensionStore = createUseStore<ExtensionStore>(getExtensionStore());
