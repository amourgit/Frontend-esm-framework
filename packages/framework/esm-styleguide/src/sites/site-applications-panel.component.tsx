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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-300 mt-1">{description}</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un outil..."
            aria-label="Rechercher un outil"
            className="w-full bg-slate-900/80 text-white placeholder-slate-400 text-xs pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:outline-hidden focus:border-teal-400/50"
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
              category === cat ? 'text-teal-300 font-bold border-b-2 border-teal-400 pb-0.5' : 'text-slate-400 hover:text-white',
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
              className="group text-left p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-teal-400/40 hover:bg-slate-800/80 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white shadow-xs', app.gradient ?? 'from-teal-500 to-emerald-600')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{app.status}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors flex items-center justify-between">
                    <span>{app.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-300" />
                  </h3>
                  <p className="text-[11px] text-teal-400/80 font-medium mt-0.5">{app.category}</p>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{app.description}</p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-slate-200">
                <span>Accéder à l'application</span>
                <span className="text-teal-400 font-semibold group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
