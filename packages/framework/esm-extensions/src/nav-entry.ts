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
  /**
   * Colonne du méga-menu (ex. `news`). Facultative : une entrée sans `group` est un lien simple.
   * Une section dont toutes les entrées sont sans `group` et qui n'en a qu'une devient un bouton
   * direct (sans menu déroulant) ; avec plusieurs, un menu à une seule colonne sans titre.
   */
  group?: string;
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
  /**
   * Espaces (Intranet, Extranet…) dans lesquels l'entrée apparaît, par identifiant d'espace
   * (ex. `['intranet']`). Absent, vide ou contenant `'*'` : tous les espaces. Toutes les
   * entrées d'une même `section` n'ont pas à partager la même liste : la section d'un espace
   * est composée des seules entrées qui y sont visibles.
   */
  workspaces?: string[];
  /**
   * Route du bouton de la section lui-même (cliquable en plus de son menu), relative à la base SPA.
   * Doit exister dans un `pages[].route`. Si plusieurs entrées d'une section la renseignent, la
   * première dans l'ordre du slot l'emporte.
   */
  sectionRoute?: string;
}

/** Valeur de `NavEntryMeta.workspaces` qui désigne « tous les espaces ». */
export const NAV_ALL_WORKSPACES = '*';

/** Valide une `meta` d'extension : vrai si c'est une `NavEntryMeta` exploitable. */
export function isNavEntryMeta(meta: unknown): meta is NavEntryMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  if (!['section', 'label', 'route'].every((k) => typeof m[k] === 'string' && (m[k] as string).length > 0)) {
    return false;
  }
  if (m.group !== undefined && (typeof m.group !== 'string' || m.group.length === 0)) return false;
  if (m.sectionRoute !== undefined && (typeof m.sectionRoute !== 'string' || m.sectionRoute.length === 0)) return false;
  if (
    m.workspaces !== undefined &&
    !(Array.isArray(m.workspaces) && m.workspaces.every((w) => typeof w === 'string'))
  ) {
    return false;
  }
  return true;
}

/** Vrai si l'entrée doit être affichée dans l'espace `workspaceId` (voir `NavEntryMeta.workspaces`). */
export function isNavEntryInWorkspace(meta: NavEntryMeta, workspaceId: string): boolean {
  const { workspaces } = meta;
  if (!workspaces || workspaces.length === 0) return true;
  return workspaces.includes(NAV_ALL_WORKSPACES) || workspaces.includes(workspaceId);
}
