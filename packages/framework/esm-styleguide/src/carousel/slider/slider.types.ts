/** @category Carousel */
import type React from 'react';
import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel';

// Ré-exportés pour que les apps consommatrices (ex. esm-home-app) puissent
// typer leurs `options`/`plugins` sans dépendre directement de embla-carousel.
export type { EmblaOptionsType, EmblaPluginType };


export interface CarouselProps {
  children: React.ReactNode;
  /** Options embla-carousel (axis, loop, align...). `axis: 'y'` pour un carrousel vertical. */
  options?: EmblaOptionsType;
  /** Plugins embla-carousel (ex. Autoplay de `embla-carousel-autoplay`). */
  plugins?: EmblaPluginType[];
  /** Sens de lecture — 'ltr' (défaut) ou 'rtl'. */
  dir?: 'ltr' | 'rtl';
  className?: string;
  style?: React.CSSProperties;
}

export interface SliderContainerProps {
  children: React.ReactNode;
  /** Dimensionne la fenêtre visible (ex. hauteur pour un axe vertical) — entièrement piloté par l'appelant. */
  className?: string;
}

export interface SliderProps {
  children: React.ReactNode;
  className?: string;
  /**
   * URL de la vignette représentant ce slide dans `ThumbsSlider`. Lu par
   * `Carousel` via introspection de ses enfants — `Slider` lui-même ne s'en
   * sert pas pour son propre rendu (voir carousel.component.tsx).
   */
  thumbnailSrc?: string;
}

export interface ThumbsSliderProps {
  className?: string;
  /** Classe appliquée à la miniature ACTIVE uniquement (mise en avant de la sélection courante). */
  thumbsSliderClassName?: string;
}

export interface SliderDotButtonProps {
  className?: string;
  dotClassName?: string;
}
