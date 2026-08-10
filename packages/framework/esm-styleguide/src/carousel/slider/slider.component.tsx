/** @category Carousel */
import React from 'react';
import classNames from 'classnames';
import { useCarouselContext } from './slider.context';
import type { SliderProps } from './slider.types';
import styles from './slider.module.scss';

/**
 * `Slider` — un slide individuel. `thumbnailSrc` n'est PAS consommé ici :
 * il est lu par `Carousel` via introspection de ses enfants pour peupler
 * `ThumbsSlider` (voir carousel.component.tsx) — ce composant se contente
 * de rendre son contenu à la taille du slide.
 */
export function Slider({ children, className }: SliderProps) {
  const { axis } = useCarouselContext();

  return <div className={classNames(styles.slide, styles[`slide--${axis}`], className)}>{children}</div>;
}
