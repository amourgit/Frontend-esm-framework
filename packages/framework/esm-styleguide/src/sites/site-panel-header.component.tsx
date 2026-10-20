/** @category Sites */
import React from 'react';
import { cn } from '../page-background/page-background.utils.js';

export interface SitePanelHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions à droite (boutons, recherche…). */
  actions?: React.ReactNode;
  className?: string;
}

/** En-tête commun des panneaux d'un site (titre, description, actions). */
export function SitePanelHeader({ icon, title, description, actions, className }: SitePanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md shrink-0',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm sm:text-base font-bold text-white truncate">{title}</h2>
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="shrink-0 self-start sm:self-auto">{actions}</div>}
    </div>
  );
}
