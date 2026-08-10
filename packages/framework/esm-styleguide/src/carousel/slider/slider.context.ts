/** @category Carousel */
import { createContext, useContext } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
import type { EmblaViewportRefType } from 'embla-carousel-react';

export interface CarouselContextValue {
  axis: 'x' | 'y';
  mainViewportRef: EmblaViewportRefType;
  mainApi: EmblaCarouselType | undefined;
  thumbsViewportRef: EmblaViewportRefType;
  thumbsApi: EmblaCarouselType | undefined;
  selectedIndex: number;
  scrollTo: (index: number) => void;
  /** URLs de vignettes déclarées par chaque `<Slider thumbnailSrc>` frère, dans l'ordre. */
  thumbnails: Array<string | undefined>;
}

export const CarouselContext = createContext<CarouselContextValue | null>(null);

export const useCarouselContext = (): CarouselContextValue => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('Carousel compound components must be used within <Carousel>');
  }
  return context;
};
