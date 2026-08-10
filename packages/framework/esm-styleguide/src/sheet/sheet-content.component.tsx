/** @category Sheet */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimation, type PanInfo } from 'framer-motion';
import classNames from 'classnames';
import { useSheetContext } from './sheet.context';
import { SheetPortal } from './sheet-portal.component';
import styles from './sheet.module.scss';

export interface SheetContentProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * `SheetContent` — le panneau lui-même. Le sens de glissement (`side`),
 * la hauteur et le seuil de fermeture viennent de `<Sheet side="..." height="..." closeThreshold={...}>`
 * (voir `SheetRoot`) plutôt que d'être re-déclarés ici : une seule source de
 * vérité par instance de Sheet.
 *
 * - `side="top"` (défaut) : le panneau descend depuis le haut de l'écran,
 *   la poignée de glissement est en bas du panneau, et on le referme en
 *   glissant vers le HAUT.
 * - `side="bottom"` : le panneau monte depuis le bas de l'écran, la
 *   poignée est en haut du panneau, et on le referme en glissant vers le
 *   BAS — comportement inversé, symétrique.
 */
export const SheetContent: React.FC<SheetContentProps> = ({ children, className = '' }) => {
  const { isOpen, onOpenChange, contentProps } = useSheetContext();
  const { height, closeThreshold, side } = contentProps;

  const controls = useAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  // signe de la direction "fermée" (hors-écran) : -1 pour top (au-dessus),
  // +1 pour bottom (en-dessous). Toute la logique de drag/anim en découle.
  const sign = side === 'top' ? -1 : 1;

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const calculateHeight = useCallback(() => {
    if (typeof window === 'undefined') {
      return 400;
    }
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let calculatedHeight: number;
    if (vw <= 640) {
      calculatedHeight = vh * 0.6;
    } else if (vw <= 1024) {
      calculatedHeight = vh * 0.55;
    } else {
      calculatedHeight = vh * 0.5;
    }

    if (height.includes('vh')) {
      calculatedHeight = (parseInt(height, 10) / 100) * vh;
    } else if (height.includes('px')) {
      calculatedHeight = parseInt(height, 10);
    }

    return Math.min(calculatedHeight, vh * 0.8);
  }, [height]);

  useEffect(() => {
    const updateHeight = () => setSheetHeight(calculateHeight());
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [calculateHeight]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 40, mass: 0.8 },
      });
    } else {
      document.body.style.overflow = '';
      controls.start({
        y: sign * (sheetHeight + 50),
        transition: { type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.3 },
      });
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, controls, sheetHeight, sign]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Le geste de fermeture va dans le sens de "sign" (vers le hors-écran) :
      // top → glisser vers le haut (offset/vitesse négatifs) ;
      // bottom → glisser vers le bas (offset/vitesse positifs).
      const offsetPastThreshold = sign * info.offset.y > sheetHeight * closeThreshold;
      const fastFlick = sign * info.velocity.y > 800;

      if (offsetPastThreshold || fastFlick) {
        onClose();
      } else {
        controls.start({ y: 0, transition: { type: 'spring', stiffness: 500, damping: 40 } });
      }
    },
    [controls, onClose, closeThreshold, sheetHeight, sign],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  if (sheetHeight === 0) {
    return null;
  }

  const dragConstraints = side === 'top' ? { top: -sheetHeight, bottom: 0 } : { top: 0, bottom: sheetHeight };
  const dragElastic = side === 'top' ? { top: 0.1, bottom: 0 } : { top: 0, bottom: 0.1 };

  return (
    <SheetPortal>
      <div className={classNames(styles.container, !isOpen && styles['container--closed'])}>
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleOverlayClick}
          className={styles.overlay}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        />

        <motion.div
          drag="y"
          dragConstraints={dragConstraints}
          dragElastic={dragElastic}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={controls}
          initial={{ y: sign * (sheetHeight + 50) }}
          className={classNames(styles.panel, styles[`panel--${side}`], className)}
          style={{ height: sheetHeight }}
        >
          {side === 'bottom' && (
            <div className={styles.handleRow}>
              <div className={styles.handle} />
            </div>
          )}

          <div className={styles.body}>
            <div className={styles.scrollArea}>{children}</div>
          </div>

          {side === 'top' && (
            <div className={styles.handleRow}>
              <div className={styles.handle} />
            </div>
          )}
        </motion.div>
      </div>
    </SheetPortal>
  );
};
