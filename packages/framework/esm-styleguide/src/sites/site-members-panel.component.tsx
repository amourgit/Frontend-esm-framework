/** @category Sites */
import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, Search, Users } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import { SitePanelHeader } from './site-panel-header.component.js';
import type { SiteMember, SiteTeam } from './site.types.js';

export interface SiteMembersPanelProps {
  siteName: string;
  members: SiteMember[];
  teams?: SiteTeam[];
  onSelect?: (member: SiteMember) => void;
  className?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function Avatar({ member, size }: { member: SiteMember; size: string }) {
  return member.avatar ? (
    <img src={member.avatar} alt="" className={cn('rounded-full object-cover border border-(--border-strong,var(--border)) shrink-0', size)} />
  ) : (
    <span className={cn('rounded-full bg-(--primary)/40 border border-(--border-strong,var(--border)) flex items-center justify-center font-bold text-(--primary-subtle-foreground,var(--primary)) shrink-0', size)}>
      {member.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Annuaire des membres d'un site : recherche, équipes, filtre alphabétique, grille/liste. */
export function SiteMembersPanel({ siteName, members, teams = [], onSelect, className }: SiteMembersPanelProps) {
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState('all');
  const [letter, setLetter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const available = useMemo(() => new Set(members.map((m) => m.name.slice(0, 1).toUpperCase())), [members]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter(
        (m) =>
          (team === 'all' || m.teamId === team) &&
          (!letter || m.name.toUpperCase().startsWith(letter)) &&
          (!q || [m.name, m.role, m.email, m.phone].some((v) => v?.toLowerCase().includes(q))),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [members, query, team, letter]);

  const pill = (active: boolean) =>
    cn(
      'px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
      active ? 'bg-(--primary) text-(--primary-foreground) border-(--primary) font-bold' : 'border-(--border) text-(--muted-foreground) hover:text-(--foreground) hover:bg-(--foreground)/10',
    );

  return (
    <div className={cn('flex-1 min-h-0 flex flex-col gap-3 text-(--foreground)', className)}>
      <SitePanelHeader
        icon={<Users className="w-4 h-4 text-(--primary)" />}
        title={`Membres & Équipes — ${siteName}`}
        description={`${visible.length} membre${visible.length > 1 ? 's' : ''} affiché${visible.length > 1 ? 's' : ''} sur ${members.length}`}
        actions={
          <div className="flex items-center gap-1 bg-(--foreground)/5 p-1 rounded-lg border border-(--border)">
            {(['grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                aria-label={mode === 'grid' ? 'Vue grille' : 'Vue liste'}
                onClick={() => setView(mode)}
                className={cn('p-1.5 rounded-md cursor-pointer', view === mode ? 'bg-(--primary) text-(--primary-foreground)' : 'text-(--muted-foreground) hover:text-(--foreground)')}
              >
                {mode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        }
      />

      <div className="relative">
        <Search className="w-4 h-4 text-(--muted-foreground) absolute left-3 top-2.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, fonction, e-mail ou téléphone..."
          aria-label="Rechercher un membre"
          className="w-full bg-(--popover)/80 text-(--foreground) placeholder-(--muted-foreground) text-xs pl-9 pr-3 py-2 rounded-lg border border-(--border) focus:outline-hidden focus:border-(--primary)/50"
        />
      </div>

      {teams.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" className={pill(team === 'all')} onClick={() => setTeam('all')}>
            Toutes les équipes
          </button>
          {teams.map((t) => (
            <button key={t.id} type="button" className={pill(team === t.id)} onClick={() => setTeam(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto text-[11px]" aria-label="Filtre alphabétique">
        <button type="button" className={pill(!letter)} onClick={() => setLetter('')}>
          Tous
        </button>
        {ALPHABET.map((l) => (
          <button
            key={l}
            type="button"
            disabled={!available.has(l)}
            onClick={() => setLetter(letter === l ? '' : l)}
            className={cn(pill(letter === l), 'px-2 disabled:opacity-30 disabled:cursor-not-allowed')}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <p className="text-center py-12 text-(--muted-foreground) text-xs">Aucun membre ne correspond à votre recherche.</p>
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(m)}
                  className="w-full text-left p-4 rounded-xl bg-(--muted)/60 border border-(--border) hover:border-(--primary)/40 hover:bg-(--muted)/80 transition-all cursor-pointer flex items-center gap-3"
                >
                  <Avatar member={m} size="w-12 h-12 text-base" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-(--foreground) truncate">{m.name}</span>
                    <span className="block text-[11px] text-(--primary)/80 truncate">{m.role}</span>
                    {m.email && <span className="block text-[11px] text-(--muted-foreground) truncate">{m.email}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-(--border) rounded-xl border border-(--border) bg-(--muted)/60">
            {visible.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onSelect?.(m)} className="w-full text-left px-3 py-2 hover:bg-(--foreground)/5 transition-colors cursor-pointer flex items-center gap-3">
                  <Avatar member={m} size="w-8 h-8 text-xs" />
                  <span className="flex-1 min-w-0 text-xs font-semibold text-(--foreground) truncate">{m.name}</span>
                  <span className="hidden sm:block text-[11px] text-(--primary)/80 truncate max-w-[40%]">{m.role}</span>
                  {m.email && <span className="hidden lg:block text-[11px] text-(--muted-foreground) truncate max-w-[30%]">{m.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
