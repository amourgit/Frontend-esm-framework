/** @category Section */
import React from 'react';
import { cn } from '../page-background/page-background.utils.js';

export interface SectionGridColumns {
  /** Nombre de colonnes par défaut (mobile). */
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}

export interface SectionGridProps {
  /** @default 'div' */
  as?: 'div' | 'ul' | 'ol';
  /**
   * Nombre de colonnes, fixe (`3`) ou par breakpoint (`{ base: 1, md: 2, xl: 4 }`).
   * Un breakpoint omis reprend la valeur du précédent. Ignoré si `minItemWidth` est fourni.
   * @default { base: 1, md: 2, lg: 3 }
   */
  columns?: number | SectionGridColumns;
  /**
   * Largeur minimale d'une carte (ex. `'16rem'`) : le nombre de colonnes
   * s'adapte alors à la largeur RÉELLE du conteneur — plus fiable que les
   * breakpoints quand la grille vit dans une colonne de page.
   */
  minItemWidth?: string;
  /** @default 'md' */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: React.ReactNode;
}

const GAP: Record<NonNullable<SectionGridProps['gap']>, string> = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-5',
  lg: 'gap-8',
  xl: 'gap-10',
};

const DEFAULT_COLUMNS: SectionGridColumns = { base: 1, md: 2, lg: 3 };
const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

/**
 * Grille responsive pour le corps d'un `Section`. Les colonnes passent par des
 * variables CSS (`--sg-*`) : n'importe quel nombre de colonnes est possible sans
 * classe Tailwind dynamique (que le scanner ne verrait pas).
 */
export function SectionGrid({
  as: Tag = 'div',
  columns = DEFAULT_COLUMNS,
  minItemWidth,
  gap = 'md',
  className,
  children,
}: SectionGridProps) {
  const style: Record<string, string> = {};
  if (minItemWidth) {
    style['--sg-min'] = minItemWidth;
  } else {
    const cols: SectionGridColumns = typeof columns === 'number' ? { base: columns } : columns;
    for (const bp of BREAKPOINTS) {
      const value = cols[bp];
      if (typeof value === 'number' && value > 0) {
        style[`--sg-${bp}`] = String(Math.floor(value));
      }
    }
  }

  return (
    <Tag
      data-section-part="grid"
      style={style as React.CSSProperties}
      className={cn(
        'grid min-w-0',
        GAP[gap],
        minItemWidth
          ? 'grid-cols-[repeat(auto-fill,minmax(min(100%,var(--sg-min)),1fr))]'
          : cn(
              'grid-cols-[repeat(var(--sg-base,1),minmax(0,1fr))]',
              'sm:grid-cols-[repeat(var(--sg-sm,var(--sg-base,1)),minmax(0,1fr))]',
              'md:grid-cols-[repeat(var(--sg-md,var(--sg-sm,var(--sg-base,1))),minmax(0,1fr))]',
              'lg:grid-cols-[repeat(var(--sg-lg,var(--sg-md,var(--sg-sm,var(--sg-base,1)))),minmax(0,1fr))]',
              'xl:grid-cols-[repeat(var(--sg-xl,var(--sg-lg,var(--sg-md,var(--sg-sm,var(--sg-base,1))))),minmax(0,1fr))]',
              '2xl:grid-cols-[repeat(var(--sg-2xl,var(--sg-xl,var(--sg-lg,var(--sg-md,var(--sg-sm,var(--sg-base,1)))))),minmax(0,1fr))]',
            ),
        className,
      )}
    >
      {children}
    </Tag>
  );
}
