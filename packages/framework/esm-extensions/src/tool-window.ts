/** @module @category Extension */

/**
 * Fenêtres d'outils du shell (façon IntelliJ).
 *
 * Le shell porte deux rails fixes (gauche et droite) et trois zones redimensionnables
 * (gauche, droite, bas). Chaque entrée d'un rail est une **extension** : sa `meta`
 * (`ToolWindowMeta`) décrit le bouton du rail, son composant est le contenu de la zone
 * associée, affiché quand le bouton est actif.
 *
 *   rail gauche, groupe haut  → slot `shell-rail-left-slot`   → zone gauche (sidebar de l'app)
 *   rail gauche, groupe bas   → slot `shell-rail-bottom-slot` → zone basse (ex. terminal)
 *   rail droit, groupe haut   → slot `shell-rail-right-slot`  → zone droite (options globales)
 *   rail droit, groupe bas    → slot `shell-rail-bottom-slot` + `meta.rail: 'right'` → zone basse
 *
 * Déclaration dans le `routes.json` d'une app :
 * `{ "slot": "shell-rail-left-slot", "component": "projectPanel", "meta": ToolWindowMeta }`.
 *
 * Les rails gauche et bas n'affichent que les extensions de l'app active, sauf celles qui
 * déclarent `meta.global: true` (toujours visibles, quelle que soit l'app active, comme le rail
 * droit). Le rail droit est entièrement global (toutes les apps, y compris celles qui ne sont
 * pas montées).
 */
export const SHELL_RAIL_LEFT_SLOT = 'shell-rail-left-slot';
export const SHELL_RAIL_BOTTOM_SLOT = 'shell-rail-bottom-slot';
export const SHELL_RAIL_RIGHT_SLOT = 'shell-rail-right-slot';

/** Zone du shell dans laquelle une fenêtre d'outils affiche son contenu. */
export type ToolWindowAnchor = 'left' | 'bottom' | 'right';

/** Slot de rail associé à chaque zone. */
export const TOOL_WINDOW_SLOTS: Readonly<Record<ToolWindowAnchor, string>> = {
  left: SHELL_RAIL_LEFT_SLOT,
  bottom: SHELL_RAIL_BOTTOM_SLOT,
  right: SHELL_RAIL_RIGHT_SLOT,
};

/** Métadonnées d'une fenêtre d'outils (bouton de rail + titre de zone). */
export interface ToolWindowMeta {
  /** Titre par défaut : info-bulle du bouton et en-tête de la zone. */
  title: string;
  /** Clé de traduction du titre (optionnelle). */
  titleKey?: string;
  /** Nom d'icône lucide (ex. `Users`), résolu par le shell dans une liste blanche. */
  icon?: string;
  /** Ordre d'affichage dans le rail (croissant) ; défaut : ordre du slot. */
  order?: number;
  /**
   * Rails gauche et bas : l'entrée reste affichée quelle que soit l'app active (option globale,
   * ex. Annuaire, News), au lieu de n'apparaître que quand son app est montée. Sans effet sur
   * le rail droit, déjà global.
   */
  global?: boolean;
  /**
   * Zone basse uniquement : rail qui porte le bouton. `left` (défaut) : groupe bas du rail gauche ;
   * `right` : groupe bas du rail droit. Dans les deux cas le contenu s'ouvre dans la zone basse,
   * qui occupe toute la largeur entre les rails.
   */
  rail?: 'left' | 'right';
}

/** Valide une `meta` d'extension : vrai si c'est une `ToolWindowMeta` exploitable. */
export function isToolWindowMeta(meta: unknown): meta is ToolWindowMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  if (typeof m.title !== 'string' || m.title.length === 0) return false;
  if (m.titleKey !== undefined && typeof m.titleKey !== 'string') return false;
  if (m.icon !== undefined && typeof m.icon !== 'string') return false;
  if (m.order !== undefined && (typeof m.order !== 'number' || !Number.isFinite(m.order))) return false;
  if (m.global !== undefined && typeof m.global !== 'boolean') return false;
  if (m.rail !== undefined && m.rail !== 'left' && m.rail !== 'right') return false;
  return true;
}
