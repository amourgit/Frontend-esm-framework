/** @category Sheet */
import React, { forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { useSheetContext } from './sheet.context';
import styles from './sheet.module.scss';

export interface SheetOverlayProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  className?: string;
}

/** Overlay autonome, à utiliser si on compose `Sheet` sans passer par `SheetContent` (rare — `SheetContent` inclut déjà le sien). */
export const SheetOverlay = forwardRef<HTMLDivElement, SheetOverlayProps>(({ className, ...props }, ref) => {
  const { isOpen, onOpenChange } = useSheetContext();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleClick}
      className={classNames(styles.overlay, className)}
      style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      {...props}
    />
  );
});
SheetOverlay.displayName = 'SheetOverlay';
