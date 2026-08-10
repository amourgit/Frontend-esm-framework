/** @category InteractiveSelector */
import type React from 'react';

/** Une option du sélecteur — devient un panneau qui s'étire au clic. */
export interface InteractiveSelectorOption {
  /** Titre affiché dans l'étiquette (visible uniquement quand l'option est active). */
  title: string;
  /** Description affichée sous le titre (visible uniquement quand l'option est active). */
  description: string;
  /** URL de l'image de fond du panneau. */
  image: string;
  /**
   * Icône affichée dans le badge circulaire de l'étiquette. N'importe quel
   * `ReactNode` — utiliser `currentColor` pour hériter automatiquement du
   * blanc du badge (voir `interactive-selector.module.scss`).
   */
  icon: React.ReactNode;
}

export interface InteractiveSelectorProps {
  /** Liste des options — un panneau par option, dans l'ordre d'affichage. */
  options: InteractiveSelectorOption[];
  /** Index actif au montage (non contrôlé). Défaut : 0. */
  defaultActiveIndex?: number;
  /** Appelé quand l'utilisateur sélectionne un panneau différent de celui actif. */
  onChange?: (index: number) => void;
  /** Titre d'en-tête, au-dessus des panneaux. Omis si non fourni. */
  title?: React.ReactNode;
  /** Sous-titre d'en-tête, sous le titre. Omis si non fourni. */
  subtitle?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
