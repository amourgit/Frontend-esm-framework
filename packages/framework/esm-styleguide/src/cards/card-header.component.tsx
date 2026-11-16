import React from 'react';
import { useLayoutType } from '@egen-civitas/esm-react-utils';
import { cn } from '../ui/cn.js';

export interface CardHeaderProps {
  /** The title for this card. This must be a pre-translated string. */
  title: string;
  /** The contents of the card header to render if any. */
  children?: React.ReactNode;
}

/**
 * Re-usable header component for O3-style cards, like those found on the entity chart
 */
export function CardHeader({ title, children }: CardHeaderProps) {
  const isTablet = useLayoutType() === 'tablet';

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-background py-3 pr-0 pl-4 rtl:pr-4 rtl:pl-0 rtl:text-right',
        isTablet ? 'h-[4.5rem]' : 'h-12',
      )}
    >
      <h4
        className={cn(
          'text-muted-foreground',
          isTablet ? 'text-xl' : 'text-sm font-semibold',
          // Liseré de marque sous le titre (couleur `--brand-03` du thème).
          "after:block after:w-8 after:border-b-[0.375rem] after:border-[var(--brand-03)] after:pt-[0.188rem] after:content-['']",
        )}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
