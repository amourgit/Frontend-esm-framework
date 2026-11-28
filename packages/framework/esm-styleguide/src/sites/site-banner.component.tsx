/** @category Sites */
import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';

export interface SiteBannerProps {
  title: string;
  subtitle?: string;
  /** Icône/avatar à gauche. */
  avatar?: React.ReactNode;
  following?: boolean;
  onToggleFollow?: () => void;
  /** Actions supplémentaires à droite (boutons, indicateurs…). */
  actions?: React.ReactNode;
  className?: string;
}

/** Bandeau d'en-tête d'un site : identité à gauche, suivi + actions à droite. */
export function SiteBanner({ title, subtitle, avatar, following, onToggleFollow, actions, className }: SiteBannerProps) {
  return (
    <div className={cn('w-full bg-(--primary-active,var(--primary)) border-b border-(--primary)/30 text-(--foreground) px-3 sm:px-6 py-2 shadow-xs', className)}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {avatar && (
            <div className="w-8 h-8 bg-(--muted)/50 border border-(--primary)/40 flex items-center justify-center shrink-0">{avatar}</div>
          )}
          <div className="flex flex-col -space-y-0.5 min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-(--primary-subtle-foreground,var(--primary))/80 text-[10px] sm:text-[11px] leading-none truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onToggleFollow && (
            <button
              type="button"
              aria-pressed={following}
              onClick={onToggleFollow}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-(--border-strong,var(--border)) hover:bg-(--foreground)/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Star className={cn('w-3.5 h-3.5', following && 'fill-(--warning) text-(--warning-subtle-foreground,var(--warning))')} />
              <span className="hidden sm:inline">{following ? 'Suivi' : 'Suivre'}</span>
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
