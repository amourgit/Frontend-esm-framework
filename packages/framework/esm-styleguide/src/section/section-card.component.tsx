/** @category Section */
import React, { type ElementType } from 'react';
import { cn } from '../page-background/page-background.utils.js';

// =============================================================================
//  SECTION CARD — carte « verre » des contenus de section
//
//  Même langage visuel pour toutes les sections d'une page, quelle que soit
//  l'app qui les fournit : fond translucide, contour fin, survol qui se relève.
//  `SectionCardTitleButton` : titre = vrai <button> dont un pseudo-élément
//  couvre toute la carte (patron « stretched link ») — carte cliquable à la
//  souris et au clavier, un seul bouton nommé pour les lecteurs d'écran, et
//  la carte peut contenir d'autres liens/boutons sans imbrication invalide.
// =============================================================================

export const SECTION_CARD_CLASS = cn(
  'group relative flex min-w-0 flex-col rounded-2xl border border-white/10 bg-slate-900/45 p-4',
  'text-slate-100 shadow-lg backdrop-blur-sm outline-none transition-all duration-300',
  'hover:-translate-y-1 hover:border-teal-400/50 hover:bg-slate-900/75 hover:shadow-2xl',
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-400',
);

export interface SectionCardProps extends React.HTMLAttributes<HTMLElement> {
  /** Balise rendue. @default 'div' */
  as?: ElementType;
}

export function SectionCard({ as: Tag = 'div', className, children, ...rest }: SectionCardProps) {
  return (
    <Tag data-section-card="" className={cn(SECTION_CARD_CLASS, className)} {...rest}>
      {children}
    </Tag>
  );
}

export interface SectionCardTitleButtonProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

/** La carte parente doit être `relative` (c'est le cas de `SectionCard`). */
export function SectionCardTitleButton({ onClick, className, children }: SectionCardTitleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full cursor-pointer border-0 bg-transparent p-0 outline-none [color:inherit] [font:inherit] [text-align:inherit]',
        "after:absolute after:inset-0 after:content-['']",
        className,
      )}
    >
      {children}
    </button>
  );
}
