/** @category DecoratedCard */
import type React from 'react';

export type CardVariant =
  | 'default'
  | 'dots'
  | 'gradient'
  | 'plus'
  | 'neubrutalism'
  | 'inner'
  | 'lifted'
  | 'corners'
  | 'glass'
  | 'mirror';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Traitement décoratif de la bordure/du cadre. Défaut : 'default'. */
  variant?: CardVariant;
  /**
   * Sous-variante de forme/taille — pour l'instant utilisée par 'mirror'
   * uniquement (pilote le padding de `.mirrorSurface`, et pour 'icon' une
   * forme compacte circulaire dédiée). Les autres variantes l'ignorent.
   * Défaut : 'default'.
   */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  /** Titre optionnel — ReactNode libre (pas seulement du texte). */
  title?: React.ReactNode;
  /** Description optionnelle — ReactNode libre. */
  description?: React.ReactNode;
  /** Contenu libre de la carte — n'importe quel composant React. Aucune taille n'est imposée : la carte s'adapte au contenu. */
  children?: React.ReactNode;
  /** Classe appliquée au conteneur de contenu interne (padding), pour surcharge fine sans toucher à la bordure décorative. */
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  /** Couleur d'accent des pastilles du variant 'dots' — token du thème. Défaut : `var(--colors-success-500)`. */
  dotsColor?: string;
}
