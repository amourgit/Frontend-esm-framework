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
  teal: { card: 'from-(--primary)/50 to-(--muted) border-(--primary)/30 hover:border-(--primary)', text: 'text-(--primary)/80', icon: 'text-(--primary)' },
  cyan: { card: 'from-(--info)/50 to-(--muted) border-(--info)/30 hover:border-(--info)', text: 'text-(--info)', icon: 'text-(--info)' },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-(--border)">
        <div>
          <h2 className="text-xl font-bold text-(--foreground)">{title}</h2>
          <p className="text-xs text-(--muted-foreground) mt-1">{description}</p>
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
                  <span className="block text-sm font-bold text-(--foreground)">{s.title}</span>
                  <span className="block text-xs text-(--muted-foreground)">{s.description}</span>
                </span>
                <Icon className={cn('w-8 h-8 shrink-0 ml-2', tone.icon)} />
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-(--muted-foreground)">Documents récents & procédures officielles</h3>
        <ul className="space-y-2">
          {resources.map((res) => (
            <li
              key={res.id}
              className="p-3 rounded-lg bg-(--muted)/60 border border-(--border) hover:border-(--primary)/40 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-(--foreground)/5 text-(--primary)/80 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-(--foreground) truncate">{res.title}</h4>
                  <p className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] text-(--muted-foreground) mt-0.5">
                    <span className="text-(--primary) font-semibold">{res.category}</span>
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
                  className="p-2 rounded-lg hover:bg-(--foreground)/10 text-(--muted-foreground) hover:text-(--foreground) transition-colors cursor-pointer shrink-0 ml-2"
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
