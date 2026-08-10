/** @category Carousel */
import React from 'react';
import classNames from 'classnames';
import { useCarouselContext } from './slider.context';
import type { ThumbsSliderProps } from './slider.types';
import styles from './slider.module.scss';

/**
 * `ThumbsSlider` — rail de miniatures synchronisé avec les slides
 * principaux (deuxième instance embla-carousel, glissable librement —
 * `dragFree`/`containScroll: 'keepSnaps'`, pattern officiel embla). Les
 * vignettes viennent des props `thumbnailSrc` de chaque `Slider` frère —
 * voir `Carousel`. Rien à rendre tant qu'aucune vignette n'est déclarée.
 *
 * `thumbsSliderClassName` s'applique à la miniature ACTIVE uniquement —
 * interprétation raisonnée en l'absence du fichier source original (voir
 * échange précédent) ; à corriger si le comportement réel diffère.
 */
export function ThumbsSlider({ className, thumbsSliderClassName }: ThumbsSliderProps) {
  const { axis, thumbsViewportRef, thumbnails, selectedIndex, scrollTo } = useCarouselContext();

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <div ref={thumbsViewportRef} className={classNames(styles.thumbsViewport, className)}>
      <div className={classNames(styles.thumbsContainer, styles[`thumbsContainer--${axis}`])}>
        {thumbnails.map((src, index) => {
          const isActive = index === selectedIndex;
          return (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={classNames(styles.thumb, { [styles['thumb--active']]: isActive }, isActive && thumbsSliderClassName)}
              aria-label={`Aller à l'élément ${index + 1}`}
              aria-current={isActive}
            >
              {src && <img src={src} alt="" className={styles.thumbImage} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
