import { useMemo } from 'react';
import {
  isToolWindowMeta,
  TOOL_WINDOW_SLOTS,
  type ToolWindowAnchor,
  type ToolWindowMeta,
} from '@egen-civitas/esm-extensions';
import { useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { translateFrom } from '@egen-civitas/esm-translations';
import { useActiveAppModules } from './use-active-app-modules.js';

export interface ToolWindow {
  /** Nom de l'extension : identifiant de la fenêtre d'outils dans sa zone. */
  id: string;
  moduleName: string;
  meta: ToolWindowMeta;
}

/** Titre affiché (traduit si `titleKey` a une traduction dans le module de l'app). */
export function toolWindowTitle({ moduleName, meta }: ToolWindow): string {
  return meta.titleKey ? translateFrom(moduleName, meta.titleKey, meta.title) : meta.title;
}

/**
 * Fenêtres d'outils d'une zone, triées par `meta.order` (puis ordre du slot).
 *
 * Zones `left` et `bottom` : celles de l'app active (le rail change avec l'app) et celles qui
 * déclarent `meta.global` (toujours présentes).
 * Zone `right` : globale, toujours toutes les extensions déclarées.
 */
export function useToolWindows(anchor: ToolWindowAnchor): ToolWindow[] {
  const assigned = useAssignedExtensions(TOOL_WINDOW_SLOTS[anchor]);
  const activeModules = useActiveAppModules();

  return useMemo(
    () =>
      assigned
        .map((extension, index) => ({ extension, index }))
        .filter(({ extension }) => isToolWindowMeta(extension.meta))
        .filter(
          ({ extension }) =>
            anchor === 'right' ||
            (extension.meta as ToolWindowMeta).global === true ||
            activeModules.has(extension.moduleName),
        )
        .sort((a, b) => {
          const orderA = (a.extension.meta as ToolWindowMeta).order ?? a.index;
          const orderB = (b.extension.meta as ToolWindowMeta).order ?? b.index;
          return orderA - orderB || a.index - b.index;
        })
        .map(({ extension }) => ({
          id: extension.name,
          moduleName: extension.moduleName,
          meta: extension.meta as ToolWindowMeta,
        })),
    [assigned, activeModules, anchor],
  );
}
