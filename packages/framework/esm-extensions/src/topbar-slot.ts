/** @module @category Extension */

/**
 * Le SEUL slot d'extension de la TopBar. Il ne désigne ni niveau ni région : chaque app y attache son composant
 * (`routes.json` : `{ "slot": "topbar-slot", "component": "…", "meta": { "topbar": TopBarPlacementMeta } }`) et
 * DÉCLARE son emplacement dans `meta.topbar`. Les niveaux n'existent que parce qu'une app les déclare.
 */
export const TOPBAR_SLOT = 'topbar-slot';

/** Régions de contenu d'un niveau de la TopBar. */
export type TopBarContentRegion = 'left' | 'center' | 'right';

/** Régions déclarables : les trois régions de contenu + le calque d'arrière-plan du niveau. */
export type TopBarRegion = TopBarContentRegion | 'background';

/**
 * Placement déclaré par une app dans `meta.topbar` d'une extension du slot {@link TOPBAR_SLOT}.
 * La TopBar est seule juge de l'interprétation : une déclaration invalide n'affiche rien, sans jamais la casser.
 */
export interface TopBarPlacementMeta {
  /** Nom du niveau (minuscules, chiffres, tirets ; commence par une lettre). Créé s'il n'existe pas, partagé sinon. */
  level: string;
  /** Position du niveau dans la pile (croissant : plus petit = plus haut). Le plus petit rang déclaré l'emporte. */
  rank?: number;
  /** Région du niveau (défaut : `left`). */
  region?: TopBarRegion;
  /** Ordre dans la région (croissant, défaut 0). */
  order?: number;
  /** Se place juste avant l'extension de ce nom (même niveau). */
  before?: string;
  /** Se place juste après l'extension de ce nom (même niveau). */
  after?: string;
}
