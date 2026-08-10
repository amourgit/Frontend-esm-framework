/** @category TestimonialCard */
import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { TestimonialCard } from './testimonial-card.component';
import type { TestimonialCardPosition, TestimonialCardStackProps } from './testimonial-card.types';
import styles from './testimonial-card-stack.module.scss';

/**
 * `TestimonialCardStack` — orchestrateur prêt à l'emploi pour `TestimonialCard` :
 * gère l'ordre de la pile et l'avance d'un cran (la carte de devant repasse
 * en dernière position) quand elle est glissée vers la gauche. Aucune
 * configuration supplémentaire nécessaire — comme `ImageSwiper`, ce
 * composant gère son propre état interne.
 *
 * Seules les deux premières cartes de la pile sont visuellement distinctes
 * (`'front'`/`'middle'`) ; toutes les suivantes partagent la position
 * `'back'` — comportement du composant source, conçu pour un rendu à 3
 * cartes visibles.
 *
 * @example
 * ```tsx
 * <TestimonialCardStack
 *   testimonials={[
 *     { id: 1, testimonial: 'Un outil qui a changé notre façon de travailler.', author: 'Amina N.' },
 *     { id: 2, testimonial: 'Déploiement multi-tenant en quelques jours.', author: 'Jean-Pierre O.' },
 *     { id: 3, testimonial: 'Le support client est remarquable.', author: 'Chantal M.' },
 *   ]}
 * />
 * ```
 */
export function TestimonialCardStack({
  testimonials,
  cardWidth = 350,
  cardHeight = 450,
  className,
  style,
  onShuffle,
}: TestimonialCardStackProps) {
  const [order, setOrder] = useState<number[]>(() => testimonials.map((_, index) => index));

  // Resynchronise l'ordre si la liste de témoignages change (longueur ou
  // identité) — évite un ordre obsolète référençant des index disparus.
  useEffect(() => {
    setOrder(testimonials.map((_, index) => index));
  }, [testimonials]);

  const handleShuffle = useCallback(() => {
    setOrder((previous) => {
      if (previous.length === 0) return previous;
      const [first, ...rest] = previous;
      onShuffle?.(testimonials[first]?.id);
      return [...rest, first];
    });
  }, [onShuffle, testimonials]);

  const getPosition = (displayIndex: number): TestimonialCardPosition => {
    if (displayIndex === 0) return 'front';
    if (displayIndex === 1) return 'middle';
    return 'back';
  };

  return (
    <div
      className={classNames(styles.stack, className)}
      style={{ width: cardWidth, height: cardHeight, ...style }}
    >
      {order.map((originalIndex, displayIndex) => {
        const item = testimonials[originalIndex];
        if (!item) return null;
        return (
          <TestimonialCard
            key={item.id}
            id={item.id}
            testimonial={item.testimonial}
            author={item.author}
            avatarUrl={item.avatarUrl}
            position={getPosition(displayIndex)}
            handleShuffle={handleShuffle}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
          />
        );
      })}
    </div>
  );
}

export default TestimonialCardStack;
