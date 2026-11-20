import {
  type AssignedExtension,
  type ExtensionSlotCustomState,
  getExtensionStore,
  registerExtensionSlot,
  updateExtensionSlotState,
} from '@egen-civitas/esm-extensions';
import { watchStore } from './store.js';

export interface ExtensionSlotConnection {
  /** Met à jour l'état partagé avec les extensions du slot. */
  update(state?: ExtensionSlotCustomState): void;
  /** Arrête l'observation (le slot reste enregistré, comme dans esm-react-utils). */
  dispose(): void;
}

/**
 * Enregistre un slot d'extensions et observe les extensions qui lui sont assignées.
 * Équivalent neutre de `useExtensionSlot` (esm-react-utils).
 */
export function connectExtensionSlot(opts: {
  moduleName: string;
  slotName: string;
  state?: ExtensionSlotCustomState;
  onExtensions: (extensions: Array<AssignedExtension>) => void;
}): ExtensionSlotConnection {
  const { moduleName, slotName } = opts;
  if (!moduleName) {
    throw new Error('Contexte de composant absent : le slot doit être rendu par un composant monté via une fabrique de lifecycle EGEN.');
  }
  registerExtensionSlot(moduleName, slotName, opts.state);
  const stop = watchStore(
    getExtensionStore() as any,
    (s: any) => (s.slots?.[slotName]?.assignedExtensions ?? []) as Array<AssignedExtension>,
    opts.onExtensions,
  );
  return {
    update: (state) => updateExtensionSlotState(slotName, state),
    dispose: stop,
  };
}
