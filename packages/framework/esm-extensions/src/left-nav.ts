import type {} from '@egen-civitas/esm-globals';
import { createGlobalStore } from '@egen-civitas/esm-state';
import { type ComponentConfig } from './types.js';
import { type ExtensionSlotState } from './store.js';

type LeftNavMode = 'normal' | 'collapsed' | 'hidden';
export interface LeftNavStore {
  slotName: string | null;
  basePath: string;
  mode: LeftNavMode;
  componentContext?: ComponentConfig;
  state?: ExtensionSlotState;
}

/** @internal */
export const leftNavStore = createGlobalStore<LeftNavStore>('left-nav', {
  slotName: null,
  basePath: window.spaBase,
  mode: 'normal',
});

export interface SetLeftNavParams {
  name: string;
  basePath: string;
  /**
   * In normal mode, the left nav is shown in desktop mode, and collapse into hamburger menu button in tablet mode
   * In collapsed mode, the left nav is always collapsed, regardless of desktop / tablet mode.
   * In hidden mode, the left nav is not shown at all.
   */
  mode?: LeftNavMode;
  componentContext?: ComponentConfig;
  state?: ExtensionSlotState;
}

/**
 * Sets the current left nav context. Must be paired with {@link unsetLeftNav}.
 *
 * @deprecated Il n'existe plus de barre latérale globale : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`, type `NavEntryMeta`). Une app qui a besoin d'une navigation interne affiche sa propre barre latérale.
 */
export function setLeftNav({ name, basePath, mode, componentContext, state }: SetLeftNavParams) {
  leftNavStore.setState({ slotName: name, basePath, mode: mode ?? 'normal', componentContext, state });
}

/**
 * Unsets the left nav context if the current context is for the supplied name.
 *
 * @deprecated Il n'existe plus de barre latérale globale : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`, type `NavEntryMeta`). Une app qui a besoin d'une navigation interne affiche sa propre barre latérale.
 */
export function unsetLeftNav(name: string) {
  if (leftNavStore.getState().slotName === name) {
    leftNavStore.setState(leftNavStore.getInitialState(), true);
  }
}
