/** @category LiquidGlassCard */
import React, { useId, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import classNames from 'classnames';
import type { LiquidGlassCardProps } from './liquid-glass-card.types';
import styles from './liquid-glass-card.module.scss';

/**
 * `LiquidGlassCard` — enveloppe tout contenu dans un effet de "verre liquide" :
 * fond flouté et légèrement distordu (filtre SVG `feTurbulence` +
 * `feDisplacementMap`), reflets internes et lueur externe configurables en
 * intensité. Peut être glissable (`draggable`) et/ou dépliable (`expandable`).
 *
 * Composant purement visuel : il ne pose AUCUNE couleur de fond opaque — le
 * flou révèle ce qu'il y a derrière lui. Un consommateur (ex. `Toast`) ajoute
 * sa propre teinte via `className`/`style`.
 *
 * @example
 * ```tsx
 * <LiquidGlassCard blurIntensity="lg" shadowIntensity="md" glowIntensity="sm" borderRadius="1rem">
 *   <p>Contenu</p>
 * </LiquidGlassCard>
 * ```
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className,
  draggable = false,
  expandable = false,
  width,
  height,
  expandedWidth,
  expandedHeight,
  blurIntensity = 'xl',
  shadowIntensity = 'md',
  glowIntensity = 'sm',
  borderRadius = '0px',
  style,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Id de filtre SVG unique par instance — l'original codait en dur
  // id="glass-blur", invalide dès que 2 cartes sont montées à la fois
  // (ex. plusieurs toasts affichés en même temps) : tous les <div> référençant
  // url(#glass-blur) pointaient alors vers le PREMIER filtre du DOM,
  // ignorant silencieusement leurs propres réglages.
  const filterId = `egen-glass-blur-${useId().replace(/:/g, '')}`;

  const handleToggleExpansion = (e: React.MouseEvent) => {
    if (!expandable) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea')) {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const containerVariants: Variants | undefined = expandable
    ? {
        collapsed: {
          width: width || 'auto',
          height: height || 'auto',
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] },
        },
        expanded: {
          width: expandedWidth || 'auto',
          height: expandedHeight || 'auto',
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] },
        },
      }
    : undefined;

  const isMotion = draggable || expandable;
  const MotionComponent = isMotion ? motion.div : 'div';

  const motionProps = isMotion
    ? {
        variants: expandable ? containerVariants : undefined,
        animate: expandable ? (isExpanded ? 'expanded' : 'collapsed') : undefined,
        onClick: expandable ? handleToggleExpansion : onClick,
        drag: draggable,
        dragConstraints: draggable ? { left: 0, right: 0, top: 0, bottom: 0 } : undefined,
        dragElastic: draggable ? 0.3 : undefined,
        dragTransition: draggable ? { bounceStiffness: 300, bounceDamping: 10, power: 0.3 } : undefined,
        whileDrag: draggable ? { scale: 1.02 } : undefined,
        whileHover: { scale: 1.01 },
        whileTap: { scale: 0.98 },
      }
    : { onClick };

  return (
    <>
      {/* Filtre de distorsion — un par instance, voir commentaire sur filterId ci-dessus */}
      <svg className={styles.hiddenFilterSvg} aria-hidden="true">
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves={1} result="turbulence" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="200" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <MotionComponent
        className={classNames(
          styles.card,
          {
            [styles['card--draggable']]: draggable,
            [styles['card--expandable']]: expandable,
          },
          className,
        )}
        style={{
          borderRadius,
          ...(width && !expandable ? { width } : undefined),
          ...(height && !expandable ? { height } : undefined),
          ...style,
        }}
        {...motionProps}
      >
        {/* Bend Layer — flou de fond + distorsion */}
        <div
          className={classNames(styles.bendLayer, styles[`blur--${blurIntensity}`])}
          style={{ borderRadius, filter: `url(#${filterId})` }}
        />

        {/* Face Layer — lueur externe */}
        <div className={classNames(styles.faceLayer, styles[`glow--${glowIntensity}`])} style={{ borderRadius }} />

        {/* Edge Layer — reflets internes */}
        <div className={classNames(styles.edgeLayer, styles[`shadow--${shadowIntensity}`])} style={{ borderRadius }} />

        {/* Contenu */}
        <div className={styles.content}>{children}</div>
      </MotionComponent>
    </>
  );
};

export default LiquidGlassCard;
