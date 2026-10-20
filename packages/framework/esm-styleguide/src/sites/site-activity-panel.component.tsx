/** @category Sites */
import React, { useMemo, useState } from 'react';
import { Activity, FileText, RefreshCw } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import { SitePanelHeader } from './site-panel-header.component.js';
import type { SiteActivity, SiteActivityAction } from './site.types.js';

export interface SiteActivityPanelProps {
  siteName: string;
  activities: SiteActivity[];
  /** Si fourni, affiche le bouton « Actualiser le flux » ; la promesse pilote l'animation. */
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

const FILTERS: Array<{ id: 'all' | SiteActivityAction; label: string }> = [
  { id: 'all', label: 'Tous les événements' },
  { id: 'upload', label: 'Téléversements & GED' },
  { id: 'validate', label: 'Validations & Scellements' },
  { id: 'member_join', label: 'Habilitations & Membres' },
  { id: 'security', label: 'Sécurité & Audit' },
];

const BADGE: Record<SiteActivityAction, { cls: string; glyph: string }> = {
  upload: { cls: 'bg-sky-500', glyph: '↑' },
  validate: { cls: 'bg-emerald-500', glyph: '✓' },
  member_join: { cls: 'bg-amber-500', glyph: '+' },
  security: { cls: 'bg-indigo-500', glyph: '!' },
  edit: { cls: 'bg-teal-500', glyph: '✎' },
};

/** Journal d'activité filtrable d'un site (timeline d'audit). */
export function SiteActivityPanel({ siteName, activities, onRefresh, className }: SiteActivityPanelProps) {
  const [filter, setFilter] = useState<'all' | SiteActivityAction>('all');
  const [refreshing, setRefreshing] = useState(false);
  const visible = useMemo(() => activities.filter((a) => filter === 'all' || a.action === filter), [activities, filter]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col gap-3 text-slate-100', className)}>
      <SitePanelHeader
        icon={<Activity className="w-4 h-4 text-sky-400" />}
        title={`Activité & Journal d'Audit — ${siteName}`}
        description="Traçabilité en temps réel des versements, consultations, modifications et habilitations du site."
        actions={
          onRefresh && (
            <button
              type="button"
              disabled={refreshing}
              onClick={refresh}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin text-teal-400')} />
              <span>Actualiser le flux</span>
            </button>
          )
        }
      />

      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer',
              filter === f.id ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white',
            )}
          >
            {f.label}
            {f.id === 'all' && ` (${activities.length})`}
          </button>
        ))}
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {visible.map((item) => (
          <li key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-sky-400/40 transition-all flex items-start gap-3">
            <div className="relative shrink-0">
              {item.userAvatar ? (
                <img src={item.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center text-[11px] font-bold">
                  {item.userName.slice(0, 1)}
                </span>
              )}
              <span
                aria-hidden="true"
                className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-slate-950', BADGE[item.action].cls)}
              >
                {BADGE[item.action].glyph}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="text-xs text-white">
                  <strong className="font-semibold text-sky-300">{item.userName}</strong>
                  <span className="text-slate-400"> ({item.userRole}) </span>
                  <span className="text-slate-300">{item.actionLabel}</span>
                </p>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{item.timeAgo}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-white truncate">{item.targetTitle}</span>
                <span className="ml-auto text-[9px] px-1.5 rounded bg-white/10 text-slate-300 shrink-0">{item.targetType}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
