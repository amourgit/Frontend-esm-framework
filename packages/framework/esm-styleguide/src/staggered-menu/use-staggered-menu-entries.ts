import { useMemo } from 'react';
import {
  resolveStaggeredMenuEntries,
  STAGGERED_MENU_SLOT,
  type AssignedExtension,
  type ResolvedStaggeredMenuEntry,
} from '@egen-civitas/esm-extensions';
import { useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { translateFrom } from '@egen-civitas/esm-translations';
import { useActiveAppModules } from '../workbench/use-active-app-modules.js';

export type StaggeredMenuEntry = ResolvedStaggeredMenuEntry<AssignedExtension>;

/** Titre affiché (traduit si `titleKey` a une traduction dans le module de l'app). */
export function staggeredMenuEntryTitle({ moduleName, meta }: Pick<StaggeredMenuEntry, 'moduleName' | 'meta'>): string {
  return meta.titleKey ? translateFrom(moduleName, meta.titleKey, meta.title) : meta.title;
}

/**
 * Entrées (composants libres des apps) du panneau, dans l'ordre d'affichage : zone, puis `meta.order`, puis
 * `meta.priority`. Une entrée n'est présente que si son app est montée ou si elle déclare `meta.global`.
 * Réévalué à chaque changement d'extensions assignées ou de route.
 *
 * @param slotName Slot du panneau (défaut `STAGGERED_MENU_SLOT`).
 * @param maxEntries Nombre maximal d'entrées ; les moins prioritaires sont écartées au-delà.
 */
export function useStaggeredMenuEntries(
  slotName: string = STAGGERED_MENU_SLOT,
  maxEntries?: number,
): StaggeredMenuEntry[] {
  const assigned = useAssignedExtensions(slotName);
  const activeModules = useActiveAppModules();

  return useMemo(
    () => resolveStaggeredMenuEntries(assigned, activeModules, { maxEntries }),
    [assigned, activeModules, maxEntries],
  );
}
