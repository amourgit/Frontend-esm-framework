/** @category Sites */
import React from 'react';
import { Download, FileText } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import type { SiteResource } from './site.types.js';

export interface SiteResourceShortcut {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Teinte Tailwind : `teal` ou `cyan`. @default 'teal' */
  tone?: 'teal' | 'cyan';
}

export interface SiteResourcesPanelProps {
  resources: SiteResource[];
  shortcuts?: SiteResourceShortcut[];
  onShortcut?: (shortcut: SiteResourceShortcut) => void;
  onDownload?: (resource: SiteResource) => void;
  /** Bouton principal de l'en-tête (ex. « Ouvrir l'espace GED »). */
  primaryAction?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const TONES = {
  teal: { card: 'from-teal-900/50 to-slate-900 border-teal-500/30 hover:border-teal-400', text: 'text-teal-300', icon: 'text-teal-400' },
  cyan: { card: 'from-cyan-900/50 to-slate-900 border-cyan-500/30 hover:border-cyan-400', text: 'text-cyan-300', icon: 'text-cyan-400' },
} as const;

/** Raccourcis d'accès rapide + liste des documents officiels d'un site. */
export function SiteResourcesPanel({
  resources,
  shortcuts = [],
  onShortcut,
  onDownload,
  primaryAction,
  title = 'Ressources Documentaires & GED',
  description = 'Guides, formulaires administratifs et accès direct à la Gestion Électronique des Documents.',
  className,
}: SiteResourcesPanelProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-300 mt-1">{description}</p>
        </div>
        {primaryAction}
      </div>

      {shortcuts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shortcuts.map((s) => {
            const tone = TONES[s.tone ?? 'teal'];
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onShortcut?.(s)}
                className={cn('text-left p-4 rounded-xl bg-gradient-to-r border transition-all cursor-pointer flex items-center justify-between', tone.card)}
              >
                <span className="space-y-1">
                  <span className={cn('block text-[10px] font-bold uppercase tracking-wider', tone.text)}>{s.eyebrow}</span>
                  <span className="block text-sm font-bold text-white">{s.title}</span>
                  <span className="block text-xs text-slate-300">{s.description}</span>
                </span>
                <Icon className={cn('w-8 h-8 shrink-0 ml-2', tone.icon)} />
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Documents récents & procédures officielles</h3>
        <ul className="space-y-2">
          {resources.map((res) => (
            <li
              key={res.id}
              className="p-3 rounded-lg bg-slate-900/60 border border-white/10 hover:border-teal-400/40 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-white/5 text-teal-300 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{res.title}</h4>
                  <p className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] text-slate-400 mt-0.5">
                    <span className="text-teal-400 font-semibold">{res.category}</span>
                    <span>•</span>
                    <span>{res.type}</span>
                    <span>•</span>
                    <span>{res.size}</span>
                    <span>•</span>
                    <span>Mis à jour le {res.updated}</span>
                  </p>
                </div>
              </div>
              {onDownload && (
                <button
                  type="button"
                  title="Télécharger"
                  aria-label={`Télécharger ${res.title}`}
                  onClick={() => onDownload(res)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
