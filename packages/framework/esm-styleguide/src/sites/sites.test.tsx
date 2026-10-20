import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SiteCarousel,
  SiteMembersPanel,
  SiteSearchBar,
  SiteSettingsPanel,
  SiteTabbedLayout,
  SiteTasksPanel,
  type SiteMember,
  type SiteSummary,
  type SiteTask,
} from './index';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

let host: HTMLElement | undefined;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

function mount(node: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}

const click = (el: Element | null | undefined) => {
  if (!el) throw new Error('élément introuvable');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const sites: SiteSummary[] = ['A', 'B', 'C'].map((n, i) => ({
  uuid: `srv-${i}`,
  name: `Site ${n}`,
  shortName: n,
  category: 'Cat',
  description: 'desc',
  head: 'Chef',
  memberCount: 1,
  appCount: 2,
  status: 'Actif',
}));

describe('SiteCarousel', () => {
  it('valide la carte centrale et recentre une carte latérale au clic', () => {
    const onSelect = vi.fn();
    const el = mount(<SiteCarousel sites={sites} onSelect={onSelect} />);
    const cards = () => Array.from(el.querySelectorAll<HTMLElement>('[role="button"][aria-label^="Site "]'));
    const center = () => cards().find((c) => c.tabIndex === 0)!;
    const first = center().getAttribute('aria-label');
    click(center());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].name).toBe(first);

    const other = cards().find((c) => c.tabIndex === -1)!;
    const otherName = other.getAttribute('aria-label');
    click(other);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(center().getAttribute('aria-label')).toBe(otherName);
  });
});

describe('SiteTabbedLayout', () => {
  it('expose les onglets en ARIA et notifie le changement', () => {
    const onTabChange = vi.fn();
    const el = mount(
      <SiteTabbedLayout
        activeTab="a"
        onTabChange={onTabChange}
        tabs={[
          { id: 'a', label: 'Un' },
          { id: 'b', label: 'Deux' },
        ]}
      >
        <p>contenu</p>
      </SiteTabbedLayout>,
    );
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    click(tabs[1]);
    expect(onTabChange).toHaveBeenCalledWith('b');
    expect(el.textContent).toContain('contenu');
  });
});

describe('SiteSearchBar', () => {
  it('affiche le panneau de filtres quand il est ouvert et le badge de filtres actifs', () => {
    const el = mount(
      <SiteSearchBar value="" onChange={() => {}} filterPanel={<div>FILTRES</div>} filtersOpen activeFilterCount={2} />,
    );
    expect(el.textContent).toContain('FILTRES');
    expect(el.textContent).toContain('2');
  });
});

describe('SiteTasksPanel', () => {
  const task: SiteTask = {
    id: 't1',
    title: 'Valider le bordereau',
    description: 'desc',
    priority: 'haute',
    status: 'todo',
    dueDate: 'demain',
    assignedBy: 'x',
    assignedTo: 'y',
    tags: [],
  };

  it('filtre par statut et remonte le changement de statut', () => {
    const onToggle = vi.fn();
    const el = mount(<SiteTasksPanel siteName="DSI" tasks={[task, { ...task, id: 't2', title: 'Autre', status: 'done' }]} onToggleStatus={onToggle} onCreate={() => {}} />);
    expect(el.textContent).toContain('Valider le bordereau');
    click(Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Terminées')));
    expect(el.textContent).not.toContain('Valider le bordereau');
    expect(el.textContent).toContain('Autre');
    click(Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Toutes')));
    click(el.querySelector('[aria-label="Changer le statut de Valider le bordereau"]'));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });
});

describe('SiteMembersPanel', () => {
  const members: SiteMember[] = [
    { id: '1', name: 'Alain B', role: 'Ingénieur', teamId: 't1' },
    { id: '2', name: 'Claire D', role: 'Gestionnaire', teamId: 't2' },
  ];

  it('filtre par équipe et lettre', () => {
    const el = mount(<SiteMembersPanel siteName="DSI" members={members} teams={[{ id: 't1', name: 'Équipe 1' }, { id: 't2', name: 'Équipe 2' }]} />);
    expect(el.textContent).toContain('Claire D');
    click(Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Équipe 1'));
    expect(el.textContent).not.toContain('Claire D');
    click(Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Toutes les équipes'));
    click(Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'C'));
    expect(el.textContent).not.toContain('Alain B');
    expect(el.textContent).toContain('Claire D');
  });
});

describe('SiteSettingsPanel', () => {
  it('enregistre la valeur modifiée', async () => {
    const onSave = vi.fn();
    const el = mount(
      <SiteSettingsPanel
        siteName="DSI"
        siteUuid="srv-1"
        initialValue={{ title: 'DSI', description: 'd', visibility: 'MODERATED', allowMemberInvites: true, notifyOnUpload: true, notifyOnValidation: true }}
        onSave={onSave}
      />,
    );
    click(el.querySelector('[role="radio"][aria-checked="false"]'));
    await act(async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PUBLIC' }));
  });
});
