/** @category Sites */
import React, { useRef } from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';

export interface SiteSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nombre de filtres actifs (affiche un badge sur le bouton). */
  activeFilterCount?: number;
  /** Panneau de filtres avancés (ex. `<FilterBar />`), replié par défaut. */
  filterPanel?: React.ReactNode;
  filtersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  onReset?: () => void;
  className?: string;
}

/** Barre de recherche + bascule d'un panneau de filtres avancés. */
export function SiteSearchBar({
  value,
  onChange,
  placeholder = 'Rechercher…',
  activeFilterCount = 0,
  filterPanel,
  filtersOpen = false,
  onFiltersOpenChange,
  onReset,
  className,
}: SiteSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showPanel = Boolean(filterPanel) && (filtersOpen || activeFilterCount > 0);
  const iconBtn =
    'p-1.5 rounded-lg border border-white/10 text-slate-400 transition-colors cursor-pointer';

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/15 backdrop-blur-sm shadow-lg overflow-hidden transition-all',
        'focus-within:border-teal-400/80 focus-within:ring-2 focus-within:ring-teal-400/20',
        className,
      )}
    >
      <div className="flex items-center px-4 py-2.5 sm:py-3 gap-3">
        <div className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-teal-300 shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 bg-transparent border-none text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none truncate"
        />
        <div className="flex items-center gap-2 shrink-0">
          {value && (
            <button
              type="button"
              title="Effacer la recherche"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className={cn(iconBtn, 'hover:bg-white/10 hover:text-white')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {filterPanel && (
            <button
              type="button"
              title="Filtres avancés"
              aria-expanded={showPanel}
              onClick={() => onFiltersOpenChange?.(!filtersOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                showPanel
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10 border-white/15',
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[1.1rem] rounded-full bg-slate-950 px-1 text-center text-[10px] font-black leading-[1.1rem] text-teal-300">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          {onReset && (value || activeFilterCount > 0) && (
            <button
              type="button"
              title="Réinitialiser"
              onClick={onReset}
              className={cn(iconBtn, 'hover:bg-rose-500/20 hover:text-rose-300')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {showPanel && <div className="dark w-full px-4 pb-3 pt-2 border-t border-white/10">{filterPanel}</div>}
    </div>
  );
}
