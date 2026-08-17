/** @module @category Extension */
import { type ExtensionSlotState, type ExtensionStore, getExtensionStore } from '@egen-civitas/esm-extensions';
import { useStore } from './useStore.js';

export const useExtensionSlotStore = (slot: string) =>
  useStore<ExtensionStore, ExtensionSlotState>(getExtensionStore(), (state) => state.slots?.[slot]);
