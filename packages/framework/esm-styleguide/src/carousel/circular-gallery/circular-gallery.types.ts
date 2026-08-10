/** @category CircularGallery */
import type React from 'react';

export interface CircularGalleryImage {
  title: string;
  url: string;
}

export interface CircularGalleryProps {
  /** Images de la galerie — aucune donnée statique, tout vient d'ici (l'original avait un tableau `images` en dur dans le module). */
  images: CircularGalleryImage[];
  /** Démarre le défilement automatique. Défaut : true. */
  autoplay?: boolean;
  /** Intervalle du défilement automatique (ms). Défaut : 4500. */
  autoplayInterval?: number;
  className?: string;
  style?: React.CSSProperties;
}
