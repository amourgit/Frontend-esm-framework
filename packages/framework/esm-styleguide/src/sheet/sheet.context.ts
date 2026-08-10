/** @category Sheet */
import { createContext, useContext } from 'react';

/** Côté depuis lequel le panneau glisse. */
export type SheetSide = 'top' | 'bottom';

export interface SheetContentConfig {
  height: string;
  className: string;
  closeThreshold: number;
  side: SheetSide;
}

export interface SheetContextValue {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentProps: SheetContentConfig;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export const useSheetContext = (): SheetContextValue => {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet compound components must be used within <Sheet>');
  }
  return context;
};
