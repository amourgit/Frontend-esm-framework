/** @category Sheet */
import React, { useCallback, useState } from 'react';
import { SheetContext } from './sheet.context';
import type { SheetSide } from './sheet.context';

export interface SheetRootProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  /** Côté depuis lequel le panneau glisse — 'top' (défaut) ou 'bottom'. */
  side?: SheetSide;
  /** Hauteur du panneau (ex. '55vh', '400px'). */
  height?: string;
  /** Fraction de la hauteur du panneau à dépasser en glissant pour déclencher la fermeture. */
  closeThreshold?: number;
}

/**
 * `Sheet` — panneau modal plein-largeur, glissable, ancré en haut ou en bas
 * de l'écran (`side`), avec fermeture par glissement (drag) ou par overlay.
 *
 * API en compound components (`Sheet.Trigger`, `Sheet.Content`,
 * `Sheet.Header`...), à la manière de Radix/shadcn.
 */
export const SheetRoot: React.FC<SheetRootProps> = ({
  children,
  open,
  onOpenChange,
  defaultOpen,
  className = '',
  side = 'top',
  height = '55vh',
  closeThreshold = 0.3,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange?.(newOpen);
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
    },
    [onOpenChange, isControlled],
  );

  return (
    <SheetContext.Provider
      value={{
        isOpen,
        onOpenChange: handleOpenChange,
        contentProps: { height, className, closeThreshold, side },
      }}
    >
      {children}
    </SheetContext.Provider>
  );
};
