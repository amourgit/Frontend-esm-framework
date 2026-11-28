import React, { useState } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  ChevronDown, 
  List, 
  Grid
} from 'lucide-react';

/** Catégories de contenu proposées par la barre d'outils. */
export type CategoryFilter = 'all' | 'documents' | 'images' | 'videos' | 'music' | 'archives';
/** Critères de tri proposés par la barre d'outils. */
export type SortOption = 'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'items_count';
/** Mode d'affichage de la liste (grille ou liste). */
export type ViewMode = 'grid' | 'list';

export interface DocumentToolbarProps {
  currentCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  sortOption: SortOption;
  onSelectSort: (sort: SortOption) => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  typeFilter: string;
  onSelectTypeFilter: (type: string) => void;
}

export function DocumentToolbar({
  currentCategory,
  onSelectCategory,
  sortOption,
  onSelectSort,
  viewMode,
  onToggleViewMode,
  typeFilter,
  onSelectTypeFilter
}: DocumentToolbarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const categories: Array<{ id: CategoryFilter; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'Tout', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'images', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'videos', label: 'Vidéos', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'music', label: 'Musique', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'archives', label: 'Archives', icon: <Archive className="w-3.5 h-3.5" /> },
  ];

  const sortOptions: Array<{ id: SortOption; label: string }> = [
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'name_asc', label: 'Nom A → Z' },
    { id: 'name_desc', label: 'Nom Z → A' },
    { id: 'items_count', label: 'Nombre d’éléments' }
  ];

  const typeOptions = ['Tous', 'Dossiers', 'Documents', 'Images', 'Vidéos', 'Archives'];

  const currentSortLabel = sortOptions.find(s => s.id === sortOption)?.label || 'Plus récents';

  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 py-1 relative z-20 [--dt-fg:var(--surface-inverse-foreground,var(--primary-foreground))] [--dt-accent:var(--success,var(--primary))]">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
        {categories.map((cat) => {
          const isActive = currentCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-(--dt-accent)/25 text-(--dt-fg) border border-(--dt-accent)/80 shadow-[0_0_12px_color-mix(in_oklab,var(--dt-accent)_30%,transparent)] drop-shadow-[0_1px_2px_color-mix(in_oklab,var(--shadow-color)_80%,transparent)]'
                  : 'bg-transparent text-(--dt-fg)/70 hover:text-(--dt-fg) hover:bg-(--dt-fg)/5 border border-(--dt-fg)/10 hover:border-(--dt-fg)/20 drop-shadow-[0_1px_1px_color-mix(in_oklab,var(--shadow-color)_80%,transparent)]'
              }`}
            >
              <span className={isActive ? 'text-(--dt-accent)' : 'text-(--dt-fg)/60'}>
                {cat.icon}
              </span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls: Sort Dropdown, Type Dropdown, Grid/List Switcher */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto mt-0.5 sm:mt-0">
        {/* Sort dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => {
              setIsSortOpen(!isSortOpen);
              setIsTypeOpen(false);
            }}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-(--shadow-color)/30 hover:bg-(--dt-fg)/5 border border-(--dt-fg)/10 hover:border-(--dt-fg)/20 text-(--dt-fg)/90 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="text-(--dt-fg)/40 hidden xs:inline">Tri :</span>
              <span className="text-(--dt-fg) font-semibold truncate max-w-[70px] sm:max-w-none">{currentSortLabel}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-(--dt-fg)/50 shrink-0" />
          </button>

          {isSortOpen && (
            <div className="absolute right-0 mt-2 w-44 py-1 rounded-lg bg-[color-mix(in_oklab,var(--shadow-color)_95%,transparent)] border border-(--dt-fg)/15 shadow-[0_10px_30px_color-mix(in_oklab,var(--shadow-color)_90%,transparent)] backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSelectSort(opt.id);
                    setIsSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] sm:text-xs transition-colors cursor-pointer ${
                    sortOption === opt.id
                      ? 'bg-(--dt-accent)/20 text-(--dt-accent) font-bold'
                      : 'text-(--dt-fg)/75 hover:bg-(--dt-fg)/10 hover:text-(--dt-fg)'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type dropdown */}
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => {
              setIsTypeOpen(!isTypeOpen);
              setIsSortOpen(false);
            }}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-(--shadow-color)/30 hover:bg-(--dt-fg)/5 border border-(--dt-fg)/10 hover:border-(--dt-fg)/20 text-(--dt-fg)/90 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="text-(--dt-fg)/40 hidden xs:inline">Type :</span>
              <span className="text-(--dt-fg) font-semibold truncate max-w-[60px] sm:max-w-none">{typeFilter}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-(--dt-fg)/50 shrink-0" />
          </button>

          {isTypeOpen && (
            <div className="absolute right-0 mt-2 w-36 py-1 rounded-lg bg-[color-mix(in_oklab,var(--shadow-color)_95%,transparent)] border border-(--dt-fg)/15 shadow-[0_10px_30px_color-mix(in_oklab,var(--shadow-color)_90%,transparent)] backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {typeOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onSelectTypeFilter(opt);
                    setIsTypeOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] sm:text-xs transition-colors cursor-pointer ${
                    typeFilter === opt
                      ? 'bg-(--dt-accent)/20 text-(--dt-accent) font-bold'
                      : 'text-(--dt-fg)/75 hover:bg-(--dt-fg)/10 hover:text-(--dt-fg)'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid vs List toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-(--shadow-color)/20 border border-(--dt-fg)/10 shrink-0">
          <button
            onClick={() => onToggleViewMode('grid')}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-(--dt-accent)/20 text-(--dt-accent)'
                : 'text-(--dt-fg)/40 hover:text-(--dt-fg)/70'
            }`}
            title="Vue Grille"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleViewMode('list')}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-(--dt-accent)/20 text-(--dt-accent)'
                : 'text-(--dt-fg)/40 hover:text-(--dt-fg)/70'
            }`}
            title="Vue Liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
