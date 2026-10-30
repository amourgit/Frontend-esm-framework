import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const slotProps = vi.hoisted(() => ({ current: undefined as Record<string, unknown> | undefined }));

vi.mock('@egen-civitas/esm-react-utils', () => ({
  Extension: ({ state }: { state?: unknown }) => <i data-testid="ext" data-state={JSON.stringify(state ?? null)} />,
  ExtensionSlot: (props: Record<string, any>) => {
    slotProps.current = props;
    const extensions = [
      { id: 'a', name: 'news', moduleName: '@x/news', meta: { title: 'Actualités' } },
      { id: 'b', name: 'agenda', moduleName: '@x/agenda', meta: {} },
    ];
    return (
      <div data-slot={props.name} className={props.className} style={props.style}>
        {extensions.map((e) => (
          <React.Fragment key={e.id}>{props.children(e)}</React.Fragment>
        ))}
      </div>
    );
  },
}));

import { SectionSlot } from './section-slot.component';

describe('SectionSlot', () => {
  it('rend chaque extension du slot dans son enveloppe, dans l’ordre fourni', () => {
    const { container } = render(<SectionSlot name="home-sections" />);
    const items = Array.from(container.querySelectorAll('[data-section-slot-item]')).map((n) =>
      n.getAttribute('data-section-slot-item'),
    );
    expect(items).toEqual(['news', 'agenda']);
    expect(slotProps.current?.name).toBe('home-sections');
  });

  it('active les en-têtes collants par défaut via des variables CSS héritables', () => {
    const { container } = render(<SectionSlot name="home-sections" />);
    const root = container.querySelector('[data-slot="home-sections"]') as HTMLElement;
    expect(root.style.getPropertyValue('--section-header-position')).toBe('sticky');
    expect(root.style.getPropertyValue('--section-sticky-top')).toBe('0px');
    expect(root.style.getPropertyValue('--section-sticky-z')).toBe('10');
  });

  it('permet de désactiver ou de décaler les en-têtes collants', () => {
    const { container, rerender } = render(<SectionSlot name="s" stickyHeaders={false} />);
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--section-header-position')).toBe('static');
    rerender(<SectionSlot name="s" stickyOffset="4rem" stickyZIndex={30} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--section-sticky-top')).toBe('4rem');
    expect(root.style.getPropertyValue('--section-sticky-z')).toBe('30');
  });

  it('transmet `state` à chaque extension et laisse `renderItem` les habiller', () => {
    render(
      <SectionSlot
        name="s"
        state={{ locale: 'fr' }}
        renderItem={(el, info) => <div data-testid={`wrap-${info.name}`}>{el}</div>}
      />,
    );
    expect(screen.getByTestId('wrap-news')).toBeInTheDocument();
    expect(screen.getAllByTestId('ext')[0].getAttribute('data-state')).toBe('{"locale":"fr"}');
  });
});
