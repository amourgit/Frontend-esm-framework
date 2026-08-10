/** @category ImageSwiper */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import type { ImageSwiperProps } from './image-swiper.types';
import styles from './image-swiper.module.scss';

/**
 * `ImageSwiper` — pile de cartes en 3D (façon Tinder), qu'on swipe à la
 * souris/au doigt pour faire défiler. La carte swipée repasse en dernière
 * position de la pile (boucle infinie).
 *
 * Toute la physique de glissement (suivi du pointeur via
 * `requestAnimationFrame`, seuil de swipe, rebond de rotation à mi-course,
 * variables CSS `--i`/`--swipe-x`/`--swipe-rotate` pilotant l'empilement 3D)
 * est reprise à l'identique du composant source — seul `images` passe d'une
 * chaîne "a.jpg, b.jpg" à parser à un tableau typé, et les classes Tailwind
 * sont remplacées par des tokens du thème.
 */
export const ImageSwiper: React.FC<ImageSwiperProps> = ({
  images,
  cardWidth = 256,
  cardHeight = 352,
  className,
  style,
  getAlt,
  onSwipe,
}) => {
  const cardStackRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  const [cardOrder, setCardOrder] = useState<number[]>(() => Array.from({ length: images.length }, (_, i) => i));

  useEffect(() => {
    setCardOrder(Array.from({ length: images.length }, (_, i) => i));
  }, [images.length]);

  const getDurationFromCSS = useCallback((variableName: string, element?: HTMLElement | null): number => {
    const targetElement = element || document.documentElement;
    const value = getComputedStyle(targetElement)?.getPropertyValue(variableName)?.trim();
    if (!value) return 0;
    if (value.endsWith('ms')) return parseFloat(value);
    if (value.endsWith('s')) return parseFloat(value) * 1000;
    return parseFloat(value) || 0;
  }, []);

  const getCards = useCallback((): HTMLElement[] => {
    if (!cardStackRef.current) return [];
    return Array.from(cardStackRef.current.querySelectorAll('[data-image-swiper-card]')) as HTMLElement[];
  }, []);

  const getActiveCard = useCallback((): HTMLElement | null => {
    const cards = getCards();
    return cards[0] || null;
  }, [getCards]);

  const updatePositions = useCallback(() => {
    const cards = getCards();
    cards.forEach((card, i) => {
      card.style.setProperty('--i', (i + 1).toString());
      card.style.setProperty('--swipe-x', '0px');
      card.style.setProperty('--swipe-rotate', '0deg');
      card.style.opacity = '1';
    });
  }, [getCards]);

  const applySwipeStyles = useCallback(
    (deltaX: number) => {
      const card = getActiveCard();
      if (!card) return;
      card.style.setProperty('--swipe-x', `${deltaX}px`);
      card.style.setProperty('--swipe-rotate', `${deltaX * 0.2}deg`);
      card.style.opacity = (1 - Math.min(Math.abs(deltaX) / 100, 1) * 0.75).toString();
    },
    [getActiveCard],
  );

  const handleStart = useCallback(
    (clientX: number) => {
      if (isSwiping.current) return;
      isSwiping.current = true;
      startX.current = clientX;
      currentX.current = clientX;
      const card = getActiveCard();
      if (card) card.style.transition = 'none';
    },
    [getActiveCard],
  );

  const handleEnd = useCallback(() => {
    if (!isSwiping.current) return;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    const deltaX = currentX.current - startX.current;
    const threshold = 50;
    const duration = getDurationFromCSS('--card-swap-duration', cardStackRef.current);
    const card = getActiveCard();

    if (card) {
      card.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;

      if (Math.abs(deltaX) > threshold) {
        const direction = Math.sign(deltaX);
        card.style.setProperty('--swipe-x', `${direction * 300}px`);
        card.style.setProperty('--swipe-rotate', `${direction * 20}deg`);

        setTimeout(() => {
          if (getActiveCard() === card) {
            card.style.setProperty('--swipe-rotate', `${-direction * 20}deg`);
          }
        }, duration * 0.5);

        setTimeout(() => {
          setCardOrder((prev) => {
            if (prev.length === 0) return [];
            onSwipe?.(prev[0], direction > 0 ? 'right' : 'left');
            return [...prev.slice(1), prev[0]];
          });
        }, duration);
      } else {
        applySwipeStyles(0);
      }
    }

    isSwiping.current = false;
    startX.current = 0;
    currentX.current = 0;
  }, [getDurationFromCSS, getActiveCard, applySwipeStyles, onSwipe]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isSwiping.current) return;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      animationFrameId.current = requestAnimationFrame(() => {
        currentX.current = clientX;
        const deltaX = currentX.current - startX.current;
        applySwipeStyles(deltaX);

        if (Math.abs(deltaX) > 50) {
          handleEnd();
        }
      });
    },
    [applySwipeStyles, handleEnd],
  );

  useEffect(() => {
    const cardStackElement = cardStackRef.current;
    if (!cardStackElement) return;

    const handlePointerDown = (e: PointerEvent) => handleStart(e.clientX);
    const handlePointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const handlePointerUp = () => handleEnd();

    cardStackElement.addEventListener('pointerdown', handlePointerDown);
    cardStackElement.addEventListener('pointermove', handlePointerMove);
    cardStackElement.addEventListener('pointerup', handlePointerUp);

    return () => {
      cardStackElement.removeEventListener('pointerdown', handlePointerDown);
      cardStackElement.removeEventListener('pointermove', handlePointerMove);
      cardStackElement.removeEventListener('pointerup', handlePointerUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleStart, handleMove, handleEnd]);

  useEffect(() => {
    updatePositions();
  }, [cardOrder, updatePositions]);

  return (
    <section
      ref={cardStackRef}
      className={classNames(styles.stack, className)}
      style={
        {
          width: cardWidth + 32,
          height: cardHeight + 32,
          '--card-perspective': '700px',
          '--card-z-offset': '12px',
          '--card-y-offset': '7px',
          '--card-max-z-index': images.length.toString(),
          '--card-swap-duration': '0.3s',
          ...style,
        } as React.CSSProperties
      }
    >
      {cardOrder.map((originalIndex, displayIndex) => (
        <article
          key={`${images[originalIndex]}-${originalIndex}`}
          data-image-swiper-card
          className={styles.imageCard}
          style={
            {
              '--i': (displayIndex + 1).toString(),
              zIndex: images.length - displayIndex,
              width: cardWidth,
              height: cardHeight,
            } as React.CSSProperties
          }
        >
          <img
            src={images[originalIndex]}
            alt={getAlt ? getAlt(originalIndex) : `Image ${originalIndex + 1}`}
            className={styles.image}
            draggable={false}
          />
        </article>
      ))}
    </section>
  );
};

export default ImageSwiper;
