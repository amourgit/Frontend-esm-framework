/** @module @category Extension */

/**
 * Nom du slot sur lequel chaque app déclare ses entrées de navigation
 * (niveau 2 de la TopBar). Déclaré dans le `routes.json` de l'app :
 * `{ "slot": "topbar-level2-nav", "component": "navEntry", "meta": NavEntryMeta }`.
 */
export const TOPBAR_LEVEL2_NAV_SLOT = 'topbar-level2-nav';

/**
 * Métadonnées d'une entrée de navigation du niveau 2 de la TopBar.
 * Partagé par les apps (qui le déclarent dans `meta`) et par la TopBar
 * (qui le lit via `useExtensionSlotMeta<NavEntryMeta>(TOPBAR_LEVEL2_NAV_SLOT)`).
 */
export interface NavEntryMeta {
  /** Entrée de niveau 2 (ex. `informations`) ; regroupe les colonnes du méga-menu. */
  section: string;
  /** Colonne du méga-menu (ex. `news`). */
  group: string;
  /** Texte par défaut, utilisé si `labelKey` n'a pas de traduction. */
  label: string;
  /** Clé de traduction du libellé (optionnelle). */
  labelKey?: string;
  /** Description par défaut. */
  description?: string;
  /** Clé de traduction de la description (optionnelle). */
  descriptionKey?: string;
  /** Nom d'icône lucide (ex. `Star`), résolu par la TopBar dans une liste blanche. */
  icon?: string;
  /** Route cible, relative à la base SPA (ex. `informations/news`). Doit exister dans un `pages[].route`. */
  route: string;
  /** Libellé/clé de la section et du groupe, si différents de leur identifiant. */
  sectionLabel?: string;
  sectionLabelKey?: string;
  groupLabel?: string;
  groupLabelKey?: string;
}

/** Valide une `meta` d'extension : vrai si c'est une `NavEntryMeta` exploitable. */
export function isNavEntryMeta(meta: unknown): meta is NavEntryMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return ['section', 'group', 'label', 'route'].every((k) => typeof m[k] === 'string' && (m[k] as string).length > 0);
}
