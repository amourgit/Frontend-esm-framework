/** @category Carousel */
import React from 'react';
import classNames from 'classnames';
import { useCarouselContext } from './slider.context';
import type { SliderDotButtonProps } from './slider.types';
import styles from './slider.module.scss';

/**
 * `SliderDotButton` — navigation par puces, alternative compacte à
 * `ThumbsSlider` quand aucune vignette n'est nécessaire. Fait partie de
 * l'API du système de carrousel mais n'est pas utilisé dans la démo
 * `VerticalThumbsAutostartSlider` (qui utilise `ThumbsSlider`) — ajouté
 * pour la parité avec l'ensemble de composants fourni.
 */
export function SliderDotButton({ className, dotClassName }: SliderDotButtonProps) {
  const { thumbnails, selectedIndex, scrollTo } = useCarouselContext();

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <div className={classNames(styles.dots, className)}>
      {thumbnails.map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => scrollTo(index)}
          className={classNames(styles.dot, { [styles['dot--active']]: index === selectedIndex }, dotClassName)}
          aria-label={`Aller à l'élément ${index + 1}`}
          aria-current={index === selectedIndex}
        />
      ))}
    </div>
  );
}
