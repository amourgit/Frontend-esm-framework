import { getGlobalStore } from '@egen-civitas/esm-state';

/**
 * Pastilles (compteurs) des boutons de rail, publiées par les apps.
 *
 * Store séparé de `workbenchStore` : les pastilles sont volatiles et ne doivent jamais être
 * mémorisées avec la disposition du plan de travail. Clé = nom de l'extension (id de la
 * fenêtre d'outils). Une valeur absente, `0` ou vide n'affiche rien.
 */
export type ToolWindowBadge = number | string;

export const workbenchBadgeStore = getGlobalStore<Record<string, ToolWindowBadge>>('workbench-badges', {});

/** Publie (ou retire avec `null`/`undefined`/`0`/`''`) la pastille de la fenêtre d'outils `id`. */
export function setToolWindowBadge(id: string, badge: ToolWindowBadge | null | undefined) {
  const state = workbenchBadgeStore.getState();
  const empty = badge === null || badge === undefined || badge === 0 || badge === '';
  if (empty) {
    if (!(id in state)) return;
    const next = { ...state };
    delete next[id];
    workbenchBadgeStore.setState(next, true);
    return;
  }
  if (state[id] !== badge) workbenchBadgeStore.setState({ ...state, [id]: badge });
}

/** Texte affiché dans la pastille : les nombres supérieurs à 99 sont plafonnés à « 99+ ». */
export function formatToolWindowBadge(badge: ToolWindowBadge): string {
  return typeof badge === 'number' && badge > 99 ? '99+' : String(badge);
}
