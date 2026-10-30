import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Section, SectionBody } from './index';
import { stickyStyleVars } from './section-sticky';

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let ioCallback: IOCallback | undefined;
let ioOptions: IntersectionObserverInit | undefined;

beforeEach(() => {
  ioCallback = undefined;
  ioOptions = undefined;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IOCallback, options?: IntersectionObserverInit) {
        ioCallback = cb;
        ioOptions = options;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const header = (container: HTMLElement) => container.querySelector('[data-section-part="header"]') as HTMLElement;

describe('stickyStyleVars', () => {
  it('ne pose que les variables demandées', () => {
    expect(stickyStyleVars({})).toEqual({});
    expect(stickyStyleVars({ sticky: true })).toEqual({ '--section-header-position': 'sticky' });
    expect(stickyStyleVars({ sticky: false, offset: '3rem', zIndex: 20 })).toEqual({
      '--section-header-position': 'static',
      '--section-sticky-top': '3rem',
      '--section-sticky-z': 20,
    });
  });
});

describe('Section — en-tête collant', () => {
  it('pose les variables CSS sur la racine quand `stickyHeader` est défini', () => {
    render(
      <Section title="Annonces" stickyHeader stickyOffset="3rem" stickyZIndex={20}>
        x
      </Section>,
    );
    const root = screen.getByRole('region', { name: 'Annonces' });
    expect(root.style.getPropertyValue('--section-header-position')).toBe('sticky');
    expect(root.style.getPropertyValue('--section-sticky-top')).toBe('3rem');
    expect(root.style.getPropertyValue('--section-sticky-z')).toBe('20');
  });

  it('n’impose rien sans `stickyHeader` : le mode est hérité du DOM (ex. SectionSlot)', () => {
    render(<Section title="Annuaire">x</Section>);
    const root = screen.getByRole('region', { name: 'Annuaire' });
    expect(root.style.getPropertyValue('--section-header-position')).toBe('');
  });

  it('le corps coupe l’héritage pour les sections imbriquées', () => {
    const { container } = render(
      <Section title="Parent" stickyHeader>
        <Section.Body>corps</Section.Body>
      </Section>,
    );
    const body = container.querySelector('[data-section-part="body"]') as HTMLElement;
    expect(body.style.getPropertyValue('--section-header-position')).toBe('static');
    expect(SectionBody).toBeDefined();
  });

  it('détecte l’état collé via IntersectionObserver quand l’en-tête est `sticky`', () => {
    const spy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(() => ({ position: 'sticky', top: '48px' }) as unknown as CSSStyleDeclaration);
    const { container } = render(<Section title="Actualités">x</Section>);
    expect(container.querySelector('[data-section-part="sticky-sentinel"]')).toBeInTheDocument();
    expect(header(container).getAttribute('data-stuck')).toBe('false');
    expect(ioOptions?.rootMargin).toBe('-48px 0px 0px 0px');

    act(() => ioCallback?.([{ isIntersecting: false }]));
    expect(header(container).getAttribute('data-stuck')).toBe('true');

    act(() => ioCallback?.([{ isIntersecting: true }]));
    expect(header(container).getAttribute('data-stuck')).toBe('false');
    spy.mockRestore();
  });
});
