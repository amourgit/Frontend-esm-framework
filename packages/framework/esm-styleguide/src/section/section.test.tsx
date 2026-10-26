import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Section, SectionAction, SectionBody, SectionFooter, SectionGrid, SectionHeader } from './index';

describe('Section', () => {
  it('rend l’en-tête (titre, compteur, actions), le corps et le pied', () => {
    render(
      <Section
        title="Actualités"
        count={8}
        actions={<SectionAction>Voir tout</SectionAction>}
        footer="6 sur 8"
        footerActions={<SectionAction>Tout lire</SectionAction>}
      >
        <p>Contenu</p>
      </Section>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Actualités' })).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir tout' })).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
    expect(screen.getByText('6 sur 8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tout lire' })).toBeInTheDocument();
  });

  it('nomme la région par son titre', () => {
    render(<Section title="Annuaire">x</Section>);
    expect(screen.getByRole('region', { name: 'Annuaire' })).toBeInTheDocument();
  });

  it('place un trait fin sous l’en-tête et au-dessus du pied, désactivables', () => {
    const { container, rerender } = render(
      <Section title="T" footer="F">
        corps
      </Section>,
    );
    expect(container.querySelectorAll('[data-section-part="divider"]')).toHaveLength(2);

    rerender(
      <Section title="T" footer="F" divider={false} footerDivider={false}>
        corps
      </Section>,
    );
    expect(container.querySelectorAll('[data-section-part="divider"]')).toHaveLength(0);
  });

  it('ne rend ni en-tête ni pied quand rien n’est fourni', () => {
    const { container } = render(<Section>corps</Section>);
    expect(container.querySelector('[data-section-part="header"]')).toBeNull();
    expect(container.querySelector('[data-section-part="footer"]')).toBeNull();
    expect(screen.getByText('corps')).toBeInTheDocument();
  });

  it('applique le niveau de titre et les classNames par partie', () => {
    const { container } = render(
      <Section title="T" titleAs="h3" classNames={{ title: 'my-title', body: 'my-body', root: 'my-root' }}>
        corps
      </Section>,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('my-title');
    expect(container.querySelector('[data-section-part="body"]')).toHaveClass('my-body');
    expect(container.firstElementChild).toHaveClass('my-root');
  });

  it('remplace titre/actions par un en-tête libre', () => {
    render(
      <Section title="ignoré" header={<div>barre perso</div>}>
        corps
      </Section>,
    );
    expect(screen.getByText('barre perso')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('accepte une composition manuelle sans double enveloppe', () => {
    const { container } = render(
      <Section ariaLabel="Équipe">
        <SectionHeader title="Équipe" />
        <SectionBody>membres</SectionBody>
        <SectionFooter>fin</SectionFooter>
      </Section>,
    );
    expect(container.querySelectorAll('[data-section-part="body"]')).toHaveLength(1);
    expect(screen.getByText('membres')).toBeInTheDocument();
    expect(screen.getByText('fin')).toBeInTheDocument();
  });

  describe('repli', () => {
    it('replie et déplie en mode non contrôlé, et masque le pied', () => {
      const onChange = vi.fn();
      render(
        <Section title="T" collapsible footer="pied" onCollapsedChange={onChange}>
          corps
        </Section>,
      );
      const toggle = screen.getByRole('button', { name: 'Replier la section' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole('button', { name: 'Déplier la section' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('pied')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Déplier la section' }));
      expect(screen.getByText('pied')).toBeInTheDocument();
    });

    it('respecte le mode contrôlé', () => {
      const onChange = vi.fn();
      render(
        <Section title="T" collapsible collapsed onCollapsedChange={onChange}>
          corps
        </Section>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Déplier la section' }));
      expect(onChange).toHaveBeenCalledWith(false);
      // l'état reste piloté par le parent
      expect(screen.getByRole('button', { name: 'Déplier la section' })).toBeInTheDocument();
    });

    it('accepte des libellés traduits', () => {
      render(
        <Section title="T" collapsible labels={{ collapse: 'Collapse', expand: 'Expand' }}>
          x
        </Section>,
      );
      expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
    });
  });
});

describe('SectionAction', () => {
  it('marque l’option active avec aria-pressed et déclenche onClick', () => {
    const onClick = vi.fn();
    render(
      <SectionAction active onClick={onClick}>
        Alertes
      </SectionAction>,
    );
    const btn = screen.getByRole('button', { name: 'Alertes' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('rend un lien quand href est fourni et sécurise target=_blank', () => {
    render(
      <SectionAction href="/x" target="_blank">
        Aller
      </SectionAction>,
    );
    const link = screen.getByRole('link', { name: 'Aller' });
    expect(link).toHaveAttribute('href', '/x');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('utilise label comme nom accessible pour un bouton icône seule', () => {
    render(<SectionAction icon={<svg />} label="Rafraîchir" />);
    expect(screen.getByRole('button', { name: 'Rafraîchir' })).toBeInTheDocument();
  });
});

describe('SectionGrid', () => {
  it('expose les colonnes par breakpoint en variables CSS', () => {
    const { container } = render(
      <SectionGrid columns={{ base: 1, md: 2, xl: 4 }}>
        <div />
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.getPropertyValue('--sg-base')).toBe('1');
    expect(grid.style.getPropertyValue('--sg-md')).toBe('2');
    expect(grid.style.getPropertyValue('--sg-xl')).toBe('4');
    expect(grid.style.getPropertyValue('--sg-sm')).toBe('');
  });

  it('passe en auto-remplissage avec minItemWidth', () => {
    const { container } = render(
      <SectionGrid minItemWidth="14rem">
        <div />
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.getPropertyValue('--sg-min')).toBe('14rem');
    expect(grid.className).toContain('auto-fill');
  });

  it('accepte un nombre de colonnes fixe et la balise ul', () => {
    const { container } = render(
      <SectionGrid as="ul" columns={3}>
        <li />
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.tagName).toBe('UL');
    expect(grid.style.getPropertyValue('--sg-base')).toBe('3');
  });
});
