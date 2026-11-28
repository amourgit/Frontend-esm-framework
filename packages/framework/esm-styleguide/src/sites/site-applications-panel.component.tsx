/** @category Sites */
import React, { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import type { SiteApplication } from './site.types.js';

export interface SiteApplicationsPanelProps {
  applications: SiteApplication[];
  onOpen: (application: SiteApplication) => void;
  title?: string;
  description?: string;
  allLabel?: string;
  className?: string;
}

/** Grille filtrable (recherche + catégories) des applications d'un site. */
export function SiteApplicationsPanel({
  applications,
  onOpen,
  title = 'Applications & Outils Métier',
  description = 'Sélectionnez une application pour y accéder directement.',
  allLabel = 'Tous',
  className,
}: SiteApplicationsPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(allLabel);
  const categories = useMemo(() => [allLabel, ...Array.from(new Set(applications.map((a) => a.category)))], [applications, allLabel]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter(
      (a) =>
        (category === allLabel || a.category === category) &&
        (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)),
    );
  }, [applications, query, category, allLabel]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-(--border)">
        <div>
          <h2 className="text-xl font-bold text-(--foreground)">{title}</h2>
          <p className="text-xs text-(--muted-foreground) mt-1">{description}</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-(--muted-foreground) absolute left-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un outil..."
            aria-label="Rechercher un outil"
            className="w-full bg-(--popover)/80 text-(--foreground) placeholder-(--muted-foreground) text-xs pl-9 pr-3 py-2 rounded-lg border border-(--border) focus:outline-hidden focus:border-(--primary)/50"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-medium">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'transition-colors cursor-pointer',
              category === cat ? 'text-(--primary)/80 font-bold border-b-2 border-(--primary) pb-0.5' : 'text-(--muted-foreground) hover:text-(--foreground)',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpen(app)}
              className="group text-left p-4 rounded-xl bg-(--muted)/60 border border-(--border) hover:border-(--primary)/40 hover:bg-(--muted)/80 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn('p-2 rounded-lg bg-gradient-to-br text-(--foreground) shadow-xs', app.gradient ?? 'from-(--primary) to-(--success-active,var(--success))')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-(--muted-foreground)">{app.status}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-(--foreground) group-hover:text-(--primary)/80 transition-colors flex items-center justify-between">
                    <span>{app.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-(--primary)/80" />
                  </h3>
                  <p className="text-[11px] text-(--primary)/80 font-medium mt-0.5">{app.category}</p>
                </div>
                <p className="text-xs text-(--muted-foreground) line-clamp-2 leading-relaxed">{app.description}</p>
              </div>
              <div className="pt-2 border-t border-(--border)/60 flex items-center justify-between text-[11px] text-(--muted-foreground) group-hover:text-(--foreground)/80">
                <span>Accéder à l'application</span>
                <span className="text-(--primary) font-semibold group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
