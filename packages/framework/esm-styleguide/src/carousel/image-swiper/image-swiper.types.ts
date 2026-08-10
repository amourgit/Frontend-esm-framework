/** @category ImageSwiper */
import type React from 'react';

export interface ImageSwiperProps {
  /** URLs des images de la pile — tableau typé (l'original prenait une chaîne "a.jpg, b.jpg" à parser, corrigé ici). */
  images: string[];
  /** Largeur d'une carte (px). Défaut : 256 (16rem). */
  cardWidth?: number;
  /** Hauteur d'une carte (px). Défaut : 352 (22rem). */
  cardHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Texte alternatif — fonction pour le personnaliser par image, sinon libellé générique. */
  getAlt?: (index: number) => string;
  /** Appelé après qu'une carte ait été swipée hors de la pile. */
  onSwipe?: (index: number, direction: 'left' | 'right') => void;
}
