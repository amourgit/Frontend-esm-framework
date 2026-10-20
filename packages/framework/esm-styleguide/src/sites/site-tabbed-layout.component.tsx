/** @category Sites */
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../page-background/page-background.utils.js';
import type { SiteTabOption } from './site.types.js';

export interface SiteTabbedLayoutProps<T extends string = string> {
  activeTab: T;
  onTabChange: (tab: T) => void;
  tabs: SiteTabOption<T>[];
  /** Contenu au-dessus de la liste d'onglets (ex. bouton « Changer de site »). */
  sidebarHeader?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  /** Titre/bandeau en tête de la zone de contenu. */
  mainHeader?: React.ReactNode;
  /** Contenu du panneau actif. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Mise en page « onglets latéraux » : liste verticale à gauche (≥ md),
 * horizontale défilante en dessous. Navigation clavier (flèches, Home/End).
 * Le contenu est celui du seul onglet actif (pas de rendu des autres).
 */
export function SiteTabbedLayout<T extends string = string>({
  activeTab,
  onTabChange,
  tabs,
  sidebarHeader,
  sidebarFooter,
  mainHeader,
  children,
  className,
}: SiteTabbedLayoutProps<T>) {
  const [vertical, setVertical] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setVertical(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = tabs.filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.id === activeTab);
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    let target: SiteTabOption<T> | undefined;
    if (e.key === nextKey) target = enabled[(index + 1) % enabled.length];
    else if (e.key === prevKey) target = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') target = enabled[0];
    else if (e.key === 'End') target = enabled[enabled.length - 1];
    if (!target) return;
    e.preventDefault();
    onTabChange(target.id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${target.id}"]`)?.focus();
  };

  return (
    <div
      className={cn(
        'w-full h-[calc(100vh-120px)] my-2 sm:my-3 text-slate-100 overflow-hidden px-3 sm:px-6 lg:px-8 flex flex-col',
        className,
      )}
    >
      <div className="max-w-7xl w-full mx-auto flex-1 min-h-0 flex flex-col md:flex-row items-stretch gap-4 md:gap-8 overflow-hidden">
        <aside className="w-full md:w-[20%] shrink-0 min-w-0 flex flex-col justify-start md:justify-center space-y-2 md:space-y-4">
          {sidebarHeader}
          <div
            ref={listRef}
            role="tablist"
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
            onKeyDown={onKeyDown}
            className="w-full flex md:flex-col items-center md:items-stretch gap-2 overflow-x-auto touch-pan-x scroll-smooth select-none py-1"
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-tab={tab.id}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  disabled={tab.disabled}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 text-left px-3.5 py-2 text-xs sm:text-sm md:text-base font-medium whitespace-nowrap cursor-pointer transition-all border-0 border-l-2',
                    active
                      ? 'border-teal-400 text-teal-300 bg-white/5'
                      : 'border-transparent text-slate-400 hover:text-white',
                    tab.disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.badge && <span className="ml-auto shrink-0">{tab.badge}</span>}
                </button>
              );
            })}
          </div>
          {sidebarFooter}
        </aside>
        <main
          role="tabpanel"
          className="w-full md:w-[80%] h-full flex-1 min-h-0 flex flex-col overflow-y-auto"
        >
          {mainHeader}
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
