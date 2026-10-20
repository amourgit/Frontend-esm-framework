/** @category Sites */
import React, { useMemo, useState } from 'react';
import { Calendar, Check, CheckCircle2, CheckSquare, Plus, Search, User, X } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import { SitePanelHeader } from './site-panel-header.component.js';
import type { SiteTask, SiteTaskPriority, SiteTaskStatus } from './site.types.js';

export interface SiteTaskDraft {
  title: string;
  description: string;
  priority: SiteTaskPriority;
  dueDate: string;
}

export interface SiteTasksPanelProps {
  siteName: string;
  tasks: SiteTask[];
  /** Appelé avec la tâche à faire avancer (todo → in_progress → done → todo). */
  onToggleStatus: (task: SiteTask) => void;
  onCreate: (draft: SiteTaskDraft) => void;
  className?: string;
}

const FILTERS: Array<{ id: 'all' | SiteTaskStatus; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'todo', label: 'À faire' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'done', label: 'Terminées' },
];

const PRIORITY = {
  haute: { label: 'Priorité Haute', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  moyenne: { label: 'Priorité Moyenne', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  basse: { label: 'Priorité Normale', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
} as const;

const inputCls =
  'w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400';

/** Liste filtrable des tâches d'un site + création via une boîte de dialogue. */
export function SiteTasksPanel({ siteName, tasks, onToggleStatus, onCreate, className }: SiteTasksPanelProps) {
  const [filter, setFilter] = useState<'all' | SiteTaskStatus>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SiteTaskDraft>({ title: '', description: '', priority: 'moyenne', dueDate: '' });

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }),
    [tasks],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (filter === 'all' || t.status === filter) &&
        (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [tasks, filter, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onCreate({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
    setDraft({ title: '', description: '', priority: 'moyenne', dueDate: '' });
    setOpen(false);
  };

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col gap-3 text-slate-100', className)}>
      <SitePanelHeader
        icon={<CheckSquare className="w-4 h-4 text-teal-400" />}
        title={`Mes tâches — ${siteName}`}
        description="Suivi des livrables, validations documentaires et actions assignées dans cet espace."
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle tâche</span>
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer',
                filter === f.id ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white',
              )}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une tâche..."
            aria-label="Rechercher une tâche"
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400/80"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {visible.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            Aucune tâche ne correspond à vos filtres.
          </div>
        ) : (
          visible.map((task) => (
            <div
              key={task.id}
              className={cn(
                'p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
                task.status === 'done' ? 'bg-slate-950/40 border-white/5 opacity-70' : 'bg-slate-900/60 border-white/10 hover:border-teal-400/40',
              )}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleStatus(task)}
                  title="Changer le statut"
                  aria-label={`Changer le statut de ${task.title}`}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0',
                    task.status === 'done'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : task.status === 'in_progress'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'border-white/20 hover:border-teal-400',
                  )}
                >
                  {task.status === 'done' && <Check className="w-3.5 h-3.5" />}
                  {task.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                </button>
                <div className="min-w-0 flex-1">
                  <h4 className={cn('text-xs sm:text-sm font-semibold text-white', task.status === 'done' && 'line-through text-slate-400')}>
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {task.dueDate}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <User className="w-3 h-3 text-teal-400" />
                      Assigné à : <strong className="text-slate-200">{task.assignedTo}</strong>
                    </span>
                    {task.tags.map((tag) => (
                      <span key={tag} className="px-1.5 rounded bg-white/5 border border-white/10 text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 shrink-0">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', PRIORITY[task.priority].cls)}>
                  {PRIORITY[task.priority].label}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    task.status === 'done' ? 'text-emerald-400' : task.status === 'in_progress' ? 'text-amber-400' : 'text-slate-400',
                  )}
                >
                  {task.status === 'done' ? '✓ Terminée' : task.status === 'in_progress' ? '● En cours' : '○ À faire'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nouvelle tâche"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-teal-400" />
                Nouvelle tâche pour {siteName}
              </h3>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3 mt-4">
              <label className="block text-xs font-semibold text-slate-300">
                <span className="block mb-1">Titre de la tâche</span>
                <input autoFocus required className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                <span className="block mb-1">Description / Consignes</span>
                <textarea rows={3} className={cn(inputCls, 'resize-none')} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-300">
                  <span className="block mb-1">Priorité</span>
                  <select className={inputCls} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as SiteTaskPriority })}>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  <span className="block mb-1">Échéance</span>
                  <input className={inputCls} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white cursor-pointer">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 cursor-pointer">
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
