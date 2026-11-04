import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AssignedExtension } from '@egen-civitas/esm-extensions';
import { ExtensionSlot, useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { StaggeredMenuPanel } from './staggered-menu-panel.component';

// L'animation GSAP n'est pas l'objet de ces tests : on la remplace par une doublure inerte (fonctions
// simples, pas des vi.fn, car `mockReset` vide les implémentations avant chaque test).
vi.mock('gsap', () => {
  const timeline: any = {
    fromTo: () => timeline,
    to: () => timeline,
    eventCallback: () => timeline,
    play: () => timeline,
    kill: () => {},
  };
  return {
    gsap: {
      context: (fn: () => void) => {
        fn();
        return { revert: () => {} };
      },
      set: () => {},
      timeline: () => timeline,
      to: () => ({ kill: () => {} }),
    },
  };
});

const mounted = vi.hoisted(() => ({ apps: [] as string[] }));
vi.mock('single-spa', () => ({ getMountedApps: () => mounted.apps }));

function extension(name: string, moduleName: string, meta: Record<string, unknown>): AssignedExtension {
  return { id: name, name, moduleName, meta, config: null };
}

let slots: Record<string, AssignedExtension[]> = {};
let lastState: unknown;

beforeEach(() => {
  mounted.apps = ['@egen/esm-annuaire-app-page-0'];
  slots = {
    'staggered-menu-slot': [
      extension('annuaire-raccourcis', '@egen/esm-annuaire-app', { title: 'Raccourcis', order: 2 }),
      extension('annuaire-recherche', '@egen/esm-annuaire-app', { title: 'Recherche', area: 'top', showTitle: true }),
      extension('sites-resume', '@egen/esm-sites-app', { title: 'Sites' }),
      extension('news-pied', '@egen/esm-news-app', { title: 'News', global: true, area: 'bottom' }),
      extension('invalide', '@egen/esm-annuaire-app', { global: true }),
    ],
    'autre-slot': [extension('autre', '@egen/esm-sites-app', { title: 'Autre', global: true })],
  };
  vi.mocked(useAssignedExtensions).mockImplementation((slot: string) => slots[slot] ?? []);
  vi.mocked(ExtensionSlot).mockImplementation((({ name, select, state }: any) => {
    lastState = state;
    return (
      <div data-testid={`slot-${name}`}>
        {(select ? select(slots[name] ?? []) : (slots[name] ?? [])).map((e: AssignedExtension) => (
          <span key={e.name}>{`content:${e.name}`}</span>
        ))}
      </div>
    );
  }) as any);
});

afterEach(cleanup);

const sections = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.sm-ext')).map((el) => el.dataset.extension);

describe('StaggeredMenuPanel — extensions', () => {
  it("n'affiche que les extensions de l'app montée et les globales, rangées par zone et par ordre", () => {
    const { container } = render(<StaggeredMenuPanel isOpen items={[{ label: 'A', ariaLabel: 'A', link: '#' }]} />);
    expect(sections(container)).toEqual(['annuaire-recherche', 'annuaire-raccourcis', 'news-pied']);
  });

  it('place chaque zone au bon endroit du panneau (haut, après les liens, bas)', () => {
    const { container } = render(
      <StaggeredMenuPanel
        isOpen
        items={[{ label: 'A', ariaLabel: 'A', link: '#' }]}
        socialItems={[{ label: 'GitHub', link: '#' }]}
      />,
    );
    const inner = container.querySelector('.sm-panel-inner') as HTMLElement;
    const kinds = Array.from(inner.children).map((el) =>
      el.classList.contains('sm-ext-area') ? `area:${(el as HTMLElement).dataset.area}` : el.className,
    );
    expect(kinds).toEqual(['area:top', 'sm-panel-list', 'area:content', 'sm-socials', 'area:bottom']);
  });

  it("n'affiche pas d'entrée quand l'app n'est plus montée, sauf globale", () => {
    mounted.apps = [];
    const { container } = render(<StaggeredMenuPanel isOpen />);
    expect(sections(container)).toEqual(['news-pied']);
  });

  it("ne charge le contenu des extensions qu'à la première ouverture, puis le garde monté", () => {
    const { rerender } = render(<StaggeredMenuPanel isOpen={false} />);
    expect(screen.queryByText('content:annuaire-raccourcis')).toBeNull();

    rerender(<StaggeredMenuPanel isOpen />);
    expect(screen.getByText('content:annuaire-raccourcis')).toBeTruthy();

    rerender(<StaggeredMenuPanel isOpen={false} />);
    expect(screen.getByText('content:annuaire-raccourcis')).toBeTruthy();
  });

  it('chaque entrée ne rend que sa propre extension (select par nom)', () => {
    const { container } = render(<StaggeredMenuPanel isOpen />);
    const section = container.querySelector('[data-extension="annuaire-raccourcis"]') as HTMLElement;
    expect(within(section).getByText('content:annuaire-raccourcis')).toBeTruthy();
    expect(within(section).queryByText('content:annuaire-recherche')).toBeNull();
  });

  it("affiche l'intitulé seulement avec showTitle, sinon le titre est le nom accessible", () => {
    const { container } = render(<StaggeredMenuPanel isOpen />);
    expect(screen.getByRole('heading', { name: 'Recherche' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Raccourcis' })).toBeNull();
    const section = container.querySelector('[data-extension="annuaire-raccourcis"]') as HTMLElement;
    expect(section.getAttribute('aria-label')).toBe('Raccourcis');
  });

  it('respecte maxExtensions en écartant les moins prioritaires', () => {
    slots['staggered-menu-slot'] = [
      extension('a', 'm', { title: 'a', global: true, order: 1, priority: 1 }),
      extension('b', 'm', { title: 'b', global: true, order: 2, priority: 9 }),
      extension('c', 'm', { title: 'c', global: true, order: 3, priority: 5 }),
    ];
    const { container } = render(<StaggeredMenuPanel isOpen maxExtensions={2} />);
    expect(sections(container)).toEqual(['b', 'c']);
  });

  it('un autre slot isole le panneau ; false désactive les extensions', () => {
    const { container, rerender } = render(<StaggeredMenuPanel isOpen extensionSlot="autre-slot" />);
    expect(sections(container)).toEqual(['autre']);

    rerender(<StaggeredMenuPanel isOpen extensionSlot={false} />);
    expect(sections(container)).toEqual([]);
  });

  it("transmet aux extensions l'état du panneau, dont closeMenu", () => {
    const onClose = vi.fn();
    render(<StaggeredMenuPanel isOpen position="left" onClose={onClose} />);
    const state = lastState as { closeMenu: () => void; position: string; isOpen: boolean };
    expect(state).toMatchObject({ position: 'left', isOpen: true });
    state.closeMenu();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rend le panneau inerte tant qu'il est fermé", () => {
    const { container, rerender } = render(<StaggeredMenuPanel isOpen={false} />);
    const panel = container.querySelector('aside') as HTMLElement;
    expect(panel.hasAttribute('inert')).toBe(true);
    rerender(<StaggeredMenuPanel isOpen />);
    expect(panel.hasAttribute('inert')).toBe(false);
  });
});

describe('StaggeredMenuPanel — closeOnClickAway', () => {
  it('ferme au clic hors du panneau', () => {
    const onClose = vi.fn();
    render(<StaggeredMenuPanel isOpen onClose={onClose} />);
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ne ferme pas au clic dans un menu ou une boîte de dialogue ouverts par un composant d'app", () => {
    const onClose = vi.fn();
    render(
      <>
        <StaggeredMenuPanel isOpen onClose={onClose} />
        <div role="listbox" data-testid="portal-listbox">
          <button type="button">option</button>
        </div>
        <div data-staggered-menu-keep-open data-testid="keep">
          <span>x</span>
        </div>
      </>,
    );
    act(() => {
      fireEvent.mouseDown(screen.getByText('option'));
      fireEvent.mouseDown(screen.getByText('x'));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
