/** @category Carousel */
import React from 'react';
import classNames from 'classnames';
import { useCarouselContext } from './slider.context';
import type { SliderContainerProps } from './slider.types';
import styles from './slider.module.scss';

/**
 * `SliderContainer` — fenêtre visible (viewport, `overflow: hidden`, porte
 * la ref embla) et piste (container flex, translatée par embla) des slides
 * principaux. La taille visible (ex. hauteur pour un axe vertical) vient
 * entièrement de `className`, comme dans l'usage source (`h-[400px]`).
 */
export function SliderContainer({ children, className }: SliderContainerProps) {
  const { axis, mainViewportRef } = useCarouselContext();

  return (
    <div ref={mainViewportRef} className={classNames(styles.viewport, styles[`viewport--${axis}`], className)}>
      <div className={classNames(styles.container, styles[`container--${axis}`])}>{children}</div>
    </div>
  );
}
