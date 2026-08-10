/** @category LayoutGrid */
import type React from 'react';

/** Une carte de la grille — contenu entièrement libre, fourni par le consommateur. */
export interface LayoutGridItem {
  id: string | number;
  /** Contenu affiché une fois la carte sélectionnée (étirée en plein cadre). */
  content: React.ReactNode;
  /** Classes de positionnement dans la grille (ex. `grid-column`/`grid-row` côté appelant). Passées telles quelles. */
  className?: string;
  /** URL de la vignette affichée dans la grille, et pendant la transition de layout partagée. */
  thumbnail: string;
}

export interface LayoutGridProps {
  /** Cartes de la grille. */
  items: LayoutGridItem[];
  className?: string;
  style?: React.CSSProperties;
}
