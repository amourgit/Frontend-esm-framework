/** @category Carousel */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import useEmblaCarousel from 'embla-carousel-react';
import { CarouselContext } from './slider.context';
import { SliderContainer } from './slider-container.component';
import type { CarouselProps, SliderContainerProps, SliderProps } from './slider.types';
import styles from './slider.module.scss';

/**
 * Extrait la liste des `thumbnailSrc` déclarés par les `<Slider>` imbriqués
 * dans le `<SliderContainer>` enfant de `<Carousel>`, sans registre d'état
 * ni `useEffect` — calcul synchrone à chaque rendu (dérivé, pas de risque de
 * flash de miniatures manquantes au premier rendu).
 */
function extractThumbnails(children: React.ReactNode): Array<string | undefined> {
  const topLevelNodes = React.Children.toArray(children);

  for (const node of topLevelNodes) {
    if (React.isValidElement(node) && node.type === SliderContainer) {
      const containerProps = node.props as SliderContainerProps;
      return React.Children.toArray(containerProps.children)
        .filter(React.isValidElement)
        .map((slide) => (slide as React.ReactElement<SliderProps>).props.thumbnailSrc);
    }
  }

  return [];
}

/**
 * `Carousel` — racine du système de carrousel en compound components :
 * enveloppe `SliderContainer` (les slides principaux) et `ThumbsSlider` et/ou
 * `SliderDotButton` (navigation), et coordonne deux instances embla-carousel
 * sous-jacentes — slides principaux et rail de miniatures — synchronisées
 * automatiquement (sélection, scroll, clic sur une miniature).
 *
 * Reconstruit selon le pattern officiel "synced thumbnails" d'embla-carousel
 * — le fichier source original (bibliothèque tierce non fournie) n'a pas pu
 * être converti directement, voir échange précédent. API fidèle à l'usage
 * fourni : `options` (dont `axis: 'y'` pour un carrousel vertical), `plugins`
 * (ex. `Autoplay` de `embla-carousel-autoplay`), `dir`.
 *
 * @example
 * ```tsx
 * <Carousel options={{ axis: 'y', loop: false }} plugins={[Autoplay({ delay: 2000 })]}>
 *   <SliderContainer className={styles.viewport}>
 *     <Slider thumbnailSrc="/1-thumb.jpg"><img src="/1.jpg" alt="Slide 1" /></Slider>
 *     <Slider thumbnailSrc="/2-thumb.jpg"><img src="/2.jpg" alt="Slide 2" /></Slider>
 *   </SliderContainer>
 *   <ThumbsSlider />
 * </Carousel>
 * ```
 */
export function Carousel({ children, options, plugins, dir = 'ltr', className, style }: CarouselProps) {
  const axis = options?.axis ?? 'x';

  const [mainViewportRef, mainApi] = useEmblaCarousel({ ...options, direction: dir }, plugins);
  const [thumbsViewportRef, thumbsApi] = useEmblaCarousel({
    axis,
    direction: dir,
    containScroll: 'keepSnaps',
    dragFree: true,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnails = useMemo(() => extractThumbnails(children), [children]);

  const scrollTo = useCallback(
    (index: number) => {
      mainApi?.scrollTo(index);
    },
    [mainApi],
  );

  const onSelect = useCallback(() => {
    if (!mainApi) {
      return;
    }
    const index = mainApi.selectedScrollSnap();
    setSelectedIndex(index);
    thumbsApi?.scrollTo(index);
  }, [mainApi, thumbsApi]);

  useEffect(() => {
    if (!mainApi) {
      return undefined;
    }
    onSelect();
    mainApi.on('select', onSelect).on('reInit', onSelect);
    return () => {
      mainApi.off('select', onSelect).off('reInit', onSelect);
    };
  }, [mainApi, onSelect]);

  return (
    <CarouselContext.Provider
      value={{ axis, mainViewportRef, mainApi, thumbsViewportRef, thumbsApi, selectedIndex, scrollTo, thumbnails }}
    >
      <div className={classNames(styles.root, className)} style={style}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}
