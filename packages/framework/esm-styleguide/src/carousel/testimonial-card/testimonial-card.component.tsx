/** @category TestimonialCard */
import React, { useRef } from 'react';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import type { TestimonialCardProps } from './testimonial-card.types';
import styles from './testimonial-card.module.scss';

/**
 * `TestimonialCard` — une carte de la pile de témoignages, glissable à la
 * souris/au doigt. Ne gère AUCUN état de pile elle-même (ordre, rotation) :
 * elle reçoit sa `position` (`'front' | 'middle' | 'back'`) d'un
 * orchestrateur parent (voir `TestimonialCardStack`) et se contente de :
 * - s'animer (rotation + décalage horizontal + `zIndex`) selon cette position ;
 * - être glissable UNIQUEMENT au premier plan (`dragListener` ne s'active
 *   que pour `position === 'front'`) ;
 * - appeler `handleShuffle` quand elle est glissée de plus de 150px vers la
 *   gauche.
 *
 * Toute la physique de glissement (seuil de 150px, élasticité 0.35,
 * transition de 0.35s, `framer-motion` déjà dépendance du styleguide) est
 * reprise à l'identique du composant source fourni — seul l'habillage
 * visuel (classes Tailwind → tokens EGEN via CSS Module) et le typage
 * changent. Le "verre" translucide de la carte (fond + flou + bordure +
 * ombre) vient du mixin `panel.panel-surface('card')` — voir
 * `testimonial-card.module.scss`.
 *
 * @example
 * ```tsx
 * <TestimonialCard
 *   id={1}
 *   testimonial="Un outil qui a changé notre façon de travailler."
 *   author="Amina N."
 *   position="front"
 *   handleShuffle={() => {}}
 * />
 * ```
 */
export function TestimonialCard({
  handleShuffle,
  testimonial,
  position,
  id,
  author,
  avatarUrl,
  cardWidth = 350,
  cardHeight = 450,
  className,
  style,
}: TestimonialCardProps) {
  const dragStartX = useRef(0);
  const isFront = position === 'front';

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent) => {
    dragStartX.current = (event as PointerEvent).clientX;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent) => {
    const clientX = (event as PointerEvent).clientX;
    if (dragStartX.current - clientX > 150) {
      handleShuffle();
    }
    dragStartX.current = 0;
  };

  return (
    <motion.div
      style={{
        zIndex: position === 'front' ? 2 : position === 'middle' ? 1 : 0,
        width: cardWidth,
        height: cardHeight,
        ...style,
      }}
      animate={{
        rotate: position === 'front' ? '-6deg' : position === 'middle' ? '0deg' : '6deg',
        x: position === 'front' ? '0%' : position === 'middle' ? '33%' : '66%',
      }}
      drag
      dragElastic={0.35}
      dragListener={isFront}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      transition={{ duration: 0.35 }}
      className={classNames(styles.card, { [styles.draggable]: isFront }, className)}
    >
      <img
        src={avatarUrl ?? `https://i.pravatar.cc/128?img=${id}`}
        alt={`Avatar of ${author}`}
        className={styles.avatar}
        draggable={false}
      />
      <span className={styles.testimonial}>&quot;{testimonial}&quot;</span>
      <span className={styles.author}>{author}</span>
    </motion.div>
  );
}

export default TestimonialCard;
