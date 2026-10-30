/** @category Section */
import type { AssignedExtension } from '@egen-civitas/esm-extensions';
import type React from 'react';

/** `onDark` : texte clair (fond de page sombre, cas par défaut). `onLight` : texte foncé. */
export type SectionTone = 'onDark' | 'onLight';
/** `plain` : aucun habillage (défaut). `glass` : panneau vitré, opt-in. */
export type SectionVariant = 'plain' | 'glass';
/** Espacement vertical entre en-tête, corps et pied. */
export type SectionDensity = 'compact' | 'comfortable' | 'spacious';
export type SectionTitleSize = 'sm' | 'md' | 'lg';
export type SectionTitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'div';
export type SectionRootTag = 'section' | 'div' | 'aside' | 'article';

/**
 * Disposition de l'en-tête.
 * - `split` (défaut) : titre à gauche, actions à droite (passent dessous si la place manque).
 * - `stacked` : titre puis actions en dessous, alignés à gauche.
 * - `centered` : titre puis actions en dessous, centrés.
 */
export type SectionHeaderLayout = 'split' | 'stacked' | 'centered';

/**
 * Disposition du pied.
 * - `between` (défaut) : contenu à gauche, actions à droite.
 * - `start` | `center` | `end` : tout regroupé de ce côté.
 */
export type SectionFooterLayout = 'between' | 'start' | 'center' | 'end';

/** Classes additionnelles par partie (fusionnées après les classes par défaut). */
export interface SectionClassNames {
  root?: string;
  header?: string;
  leading?: string;
  heading?: string;
  title?: string;
  description?: string;
  count?: string;
  actions?: string;
  divider?: string;
  body?: string;
  footer?: string;
  footerStart?: string;
  footerEnd?: string;
}

/** Libellés accessibles du bouton replier/déplier. Doivent être déjà traduits. */
export interface SectionLabels {
  collapse: string;
  expand: string;
}

export interface SectionHeaderProps {
  /** Titre de la section (à gauche en disposition `split`). */
  title?: React.ReactNode;
  /** Balise du titre. @default 'h2' */
  titleAs?: SectionTitleTag;
  /** Taille typographique du titre. @default 'md' */
  titleSize?: SectionTitleSize;
  /** Icône ou visuel placé avant le titre. */
  icon?: React.ReactNode;
  /** Texte descriptif sous le titre. */
  description?: React.ReactNode;
  /** Compteur affiché en pastille après le titre (masqué si `undefined`/`null`). */
  count?: number | string | null;
  /** Boutons de contrôle, filtres, menus... (à droite en disposition `split`). */
  actions?: React.ReactNode;
  /** Remplace entièrement titre/description/actions par un contenu libre. */
  children?: React.ReactNode;
  /** Surcharge la disposition définie sur `Section`. */
  layout?: SectionHeaderLayout;
  /** Trait fin sous l'en-tête. Surcharge la valeur de `Section`. */
  divider?: boolean;
  className?: string;
}

export interface SectionBodyProps {
  children?: React.ReactNode;
  /** Supprime l'espacement entre le trait de l'en-tête et le contenu. @default false */
  flush?: boolean;
  /** Hauteur max (ex. `'24rem'`) : au-delà, le corps défile verticalement. */
  maxHeight?: string;
  className?: string;
}

export interface SectionFooterProps {
  /** Contenu principal (à gauche en disposition `between`). */
  children?: React.ReactNode;
  /** Actions (à droite en disposition `between`). */
  actions?: React.ReactNode;
  /** Surcharge la disposition définie sur `Section`. */
  layout?: SectionFooterLayout;
  /** Trait fin au-dessus du pied. Surcharge la valeur de `Section`. */
  divider?: boolean;
  className?: string;
}

export interface SectionProps {
  id?: string;
  /** Balise racine. @default 'section' */
  as?: SectionRootTag;
  /** Libellé accessible si le titre visuel ne suffit pas. */
  ariaLabel?: string;
  variant?: SectionVariant;
  tone?: SectionTone;
  density?: SectionDensity;

  // ── En-tête (raccourcis ; voir SectionHeaderProps) ───────────────────────
  title?: React.ReactNode;
  titleAs?: SectionTitleTag;
  titleSize?: SectionTitleSize;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  count?: number | string | null;
  actions?: React.ReactNode;
  /** Contenu libre qui remplace titre/description/actions. */
  header?: React.ReactNode;
  /** @default 'split' */
  headerLayout?: SectionHeaderLayout;
  /** Trait fin sous l'en-tête. @default true */
  divider?: boolean;

  // ── En-tête collant (sticky) ─────────────────────────────────────────────
  /**
   * Garde l'en-tête collé en haut de la zone de défilement tant que le corps
   * de la section est visible ; il repart avec la section, et celui de la
   * section suivante prend le relais. Absent : hérite du `SectionSlot` parent
   * (collant par défaut dans un slot), sinon non collant.
   */
  stickyHeader?: boolean;
  /** Décalage du haut de la zone (longueur CSS, ex. `'3rem'`). @default '0px' */
  stickyOffset?: string;
  /** Empilement de l'en-tête collant. @default 10 */
  stickyZIndex?: number;

  // ── Pied ─────────────────────────────────────────────────────────────────
  /** Contenu du pied (à gauche en disposition `between`). Pas de pied si absent. */
  footer?: React.ReactNode;
  /** Actions du pied (à droite en disposition `between`). */
  footerActions?: React.ReactNode;
  /** @default 'between' */
  footerLayout?: SectionFooterLayout;
  /** Trait fin au-dessus du pied. @default true */
  footerDivider?: boolean;

  // ── Corps ────────────────────────────────────────────────────────────────
  /** Hauteur max du corps (défile au-delà). */
  bodyMaxHeight?: string;
  /** Supprime l'espacement entre le trait de l'en-tête et le contenu. */
  bodyFlush?: boolean;

  // ── Repli ────────────────────────────────────────────────────────────────
  /** Affiche un bouton replier/déplier dans l'en-tête. @default false */
  collapsible?: boolean;
  /** État replié (mode contrôlé). */
  collapsed?: boolean;
  /** État replié initial (mode non contrôlé). @default false */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** @default { collapse: 'Replier la section', expand: 'Déplier la section' } */
  labels?: Partial<SectionLabels>;

  className?: string;
  classNames?: SectionClassNames;
  /**
   * Contenu du corps. Si les enfants contiennent déjà `SectionHeader`,
   * `SectionBody` ou `SectionFooter`, ils sont rendus tels quels (composition
   * manuelle) ; sinon ils sont enveloppés dans un `SectionBody`.
   */
  children?: React.ReactNode;
}

export interface SectionSlotItemInfo {
  /** Nom de l'extension (clé `name` de `routes.json`). */
  name: string;
  /** Module qui a déclaré l'extension. */
  moduleName: string;
  /** `meta` déclarée par l'extension dans `routes.json`. */
  meta: Record<string, unknown>;
}

export type SectionSlotGap = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface SectionSlotProps {
  /** Nom du slot d'extensions (ex. `'home-sections'`). */
  name: string;
  /** Données transmises à chaque extension (props de leur composant racine). */
  state?: Record<string | symbol | number, unknown>;
  /** Filtre / réordonne les extensions (même contrat que `ExtensionSlot`). */
  select?: (extensions: Array<AssignedExtension>) => Array<AssignedExtension>;
  /** En-têtes collants pour toutes les sections du slot. @default true */
  stickyHeaders?: boolean;
  /** Décalage du haut de la zone de défilement (longueur CSS). @default '0px' */
  stickyOffset?: string;
  /** Empilement des en-têtes collants. @default 10 */
  stickyZIndex?: number;
  /** Espace vertical entre les sections. @default 'lg' */
  gap?: SectionSlotGap;
  /** Habille chaque extension (ex. pour une grille ou un conteneur dédié). */
  renderItem?: (element: React.ReactElement, info: SectionSlotItemInfo) => React.ReactNode;
  className?: string;
  /** Classe de l'enveloppe de chaque extension. */
  itemClassName?: string;
  style?: React.CSSProperties;
}
