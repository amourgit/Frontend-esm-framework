'use client';

import React, { forwardRef } from 'react';

export interface WaterGlassModalProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Option component/node if passed explicitly as requested */
  optionsComponent?: React.ReactNode;
  /** Header slot */
  header?: React.ReactNode;
  /** Footer slot */
  footer?: React.ReactNode;
  /** Alignment relative to parent container */
  align?: 'left' | 'right' | 'center' | 'none';
  /** Width class or inline size */
  width?: string;
  /** Additional container classes */
  className?: string;
  /** Content wrapper classes */
  contentClassName?: string;
}

/**
 * WaterGlassModal
 * Composant de référence réutilisable pour tous les modals / popovers / menus déroulants
 * Design Glassmorphism pur effet « eau transparente », sans fond blanc opaque.
 */
export const WaterGlassModal = forwardRef<HTMLDivElement, WaterGlassModalProps>(
  (
    {
      children,
      optionsComponent,
      header,
      footer,
      align = 'right',
      width,
      className = '',
      contentClassName = '',
      ...rest
    },
    ref
  ) => {
    const alignmentClasses = {
      right: 'right-0',
      left: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      none: '',
    }[align];

    const hasPosition = className.includes('fixed') || className.includes('absolute');
    const defaultPosition = hasPosition ? '' : 'absolute top-full mt-2';

    return (
      <div
        ref={ref}
        className={`${defaultPosition} z-[9999] text-xs text-slate-100 select-none overflow-hidden
          bg-slate-950/90 backdrop-blur-3xl rounded-2xl border border-white/20
          shadow-[0_16px_48px_0_rgba(0,0,0,0.65)]
          before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/[0.12] before:to-transparent before:pointer-events-none
          animate-in fade-in zoom-in-95 duration-150
          ${alignmentClasses}
          ${width || ''}
          ${className}
        `}
        {...rest}
      >
        {/* Inner Content Slot */}
        <div className={`relative z-10 p-1.5 ${contentClassName}`}>
          {header && (
            <div className="pb-1.5 mb-1.5 border-b border-white/10 px-2 pt-1">
              {header}
            </div>
          )}

          {/* Options Component or Children */}
          {optionsComponent || children}

          {footer && (
            <div className="pt-1.5 mt-1.5 border-t border-white/10 px-2 pb-1">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

WaterGlassModal.displayName = 'WaterGlassModal';

export default WaterGlassModal;
