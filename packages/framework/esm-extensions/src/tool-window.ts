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
  /**
   * Icône personnalisée (apps distantes/fédérées qui ne trouvent pas leur bonheur dans la liste
   * blanche) : URL `https://…`, chemin absolu `/…` ou `data:image/svg+xml|png|webp…`. Affichée comme un
   * masque monochrome (elle prend la couleur du rail) : fournir une icône d'une seule teinte. Prioritaire
   * sur `icon`. Jamais injectée comme HTML : aucun script ne peut s'exécuter.
   */
  iconUrl?: string;
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

/** Vrai si `url` est une URL d'icône autorisée (`ToolWindowMeta.iconUrl`). */
export function isSafeToolWindowIconUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  return /^(https:\/\/|\/(?!\/)|data:image\/(svg\+xml|png|webp|gif|jpeg)[;,])/i.test(url);
}

/**
 * Liste précise des problèmes d'une `meta` de fenêtre d'outils (vide = valide). Sert aux messages
 * d'avertissement à l'enregistrement : une entrée invalide n'apparaît pas dans les rails, et le dire
 * clairement évite de chercher pourquoi à l'intégration d'une app distante.
 */
export function getToolWindowMetaProblems(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object') return ['`meta` est absente : ajouter au moins { "title": "…" }'];
  const m = meta as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof m.title !== 'string' || m.title.length === 0) problems.push('`title` doit être une chaîne non vide');
  if (m.titleKey !== undefined && typeof m.titleKey !== 'string') problems.push('`titleKey` doit être une chaîne');
  if (m.icon !== undefined && typeof m.icon !== 'string') problems.push('`icon` doit être une chaîne');
  if (m.iconUrl !== undefined && !isSafeToolWindowIconUrl(m.iconUrl))
    problems.push('`iconUrl` doit commencer par https://, / ou data:image/(svg+xml|png|webp|gif|jpeg)');
  if (m.order !== undefined && (typeof m.order !== 'number' || !Number.isFinite(m.order)))
    problems.push('`order` doit être un nombre fini');
  if (m.global !== undefined && typeof m.global !== 'boolean') problems.push('`global` doit être un booléen');
  if (m.rail !== undefined && m.rail !== 'left' && m.rail !== 'right') problems.push('`rail` vaut "left" ou "right"');
  return problems;
}

/** Valide une `meta` d'extension : vrai si c'est une `ToolWindowMeta` exploitable. */
export function isToolWindowMeta(meta: unknown): meta is ToolWindowMeta {
  return getToolWindowMetaProblems(meta).length === 0;
}

/** Vrai si `slot` est l'un des slots de rail du shell. */
export function isToolWindowSlot(slot: string): boolean {
  return (Object.values(TOOL_WINDOW_SLOTS) as string[]).includes(slot);
}
