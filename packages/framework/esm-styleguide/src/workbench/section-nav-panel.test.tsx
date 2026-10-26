import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AssignedExtension } from '@egen-civitas/esm-extensions';
import { navigate } from '@egen-civitas/esm-navigation';
import { useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { SectionNavPanel } from './section-nav-panel.component';

vi.mock('@egen-civitas/esm-navigation', () => ({ navigate: vi.fn() }));

function entry(name: string, meta: Record<string, unknown>): AssignedExtension {
  return { id: name, name, moduleName: '@egen/esm-informations-app', meta, config: null };
}

const nav = (route: string) => ({ section: 'informations', route, label: route, workspaces: ['intranet'] });

function goTo(path: string) {
  window.history.pushState({}, '', `/egen-civitas/spa/${path}`);
  act(() => {
    window.dispatchEvent(new Event('single-spa:routing-event'));
  });
}

beforeEach(() => {
  window.history.pushState({}, '', '/egen-civitas/spa/informations/news');
  vi.mocked(useAssignedExtensions).mockReturnValue([
    entry('news-1', {
      ...nav('informations/news'),
      group: 'news',
      groupLabel: 'News',
      label: 'À la Une',
      icon: 'Star',
    }),
    entry('news-2', { ...nav('informations/news'), group: 'news', groupLabel: 'News', label: 'Articles' }),
    entry('annonces-1', {
      ...nav('informations/annonces'),
      group: 'annonces',
      groupLabel: 'Annonces',
      label: 'Salle des Annonces',
    }),
    entry('contacts', { section: 'annuaire', route: 'annuaire/contacts', label: 'Contacts' }),
    entry('broken', { section: 'informations', label: 'Sans route' }),
  ]);
});

describe('SectionNavPanel', () => {
  it('liste les sous-options de la section, regroupées, sans celles des autres sections ni les meta invalides', () => {
    render(<SectionNavPanel section="informations" />);
    const news = within(screen.getByRole('group', { name: 'News' }));
    expect(news.getAllByRole('button').map((b) => b.textContent)).toEqual(['À la Une', 'Articles']);
    const annonces = within(screen.getByRole('group', { name: 'Annonces' }));
    expect(annonces.getAllByRole('button').map((b) => b.textContent)).toEqual(['Salle des Annonces']);
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Sans route')).not.toBeInTheDocument();
  });

  it("n'affiche rien quand la section n'a aucune sous-option", () => {
    const { container } = render(<SectionNavPanel section="inconnue" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('un clic navigue vers la route de la sous-option (base SPA interpolée par navigate)', () => {
    render(<SectionNavPanel section="informations" />);
    fireEvent.click(screen.getByRole('button', { name: 'Salle des Annonces' }));
    expect(navigate).toHaveBeenCalledWith({ to: '${egenSpaBase}/informations/annonces' });
  });

  it('marque la sous-option active selon la route, y compris après un changement de route', () => {
    render(<SectionNavPanel section="informations" />);
    expect(screen.getByRole('button', { name: 'À la Une' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Articles' })).not.toHaveAttribute('aria-current');
    goTo('informations/annonces');
    expect(screen.getByRole('button', { name: 'Salle des Annonces' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'À la Une' })).not.toHaveAttribute('aria-current');
  });

  it('à route égale, la sous-option cliquée est la sous-option active', () => {
    render(<SectionNavPanel section="informations" />);
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }));
    expect(screen.getByRole('button', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'À la Une' })).not.toHaveAttribute('aria-current');
  });
});
