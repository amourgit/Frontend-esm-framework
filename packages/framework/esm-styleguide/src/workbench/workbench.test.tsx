import React, { useContext } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AssignedExtension } from '@egen-civitas/esm-extensions';
import { ComponentContext, ExtensionSlot, useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { LeftRail, RightRail } from './tool-window-rail.component';
import { ToolWindowZone } from './tool-window-zone.component';
import {
  clampZoneSize,
  closeToolWindow,
  DEFAULT_ZONE_SIZES,
  resetZoneSize,
  setZoneSize,
  toggleToolWindow,
  WORKBENCH_STORAGE_KEY,
  workbenchStore,
} from './workbench.store';
import { formatToolWindowBadge, setToolWindowBadge, workbenchBadgeStore } from './workbench-badges';

const mounted = vi.hoisted(() => ({ apps: [] as string[] }));
vi.mock('single-spa', () => ({ getMountedApps: () => mounted.apps }));

function extension(name: string, moduleName: string, meta: Record<string, unknown>): AssignedExtension {
  return { id: name, name, moduleName, meta, config: null };
}

let slots: Record<string, AssignedExtension[]> = {};

beforeEach(() => {
  mounted.apps = ['@egen/esm-annuaire-app-page-0'];
  slots = {
    'shell-rail-left-slot': [
      extension('annuaire-tree', '@egen/esm-annuaire-app', { title: 'Annuaire', icon: 'Users', order: 2 }),
      extension('annuaire-search', '@egen/esm-annuaire-app', { title: 'Recherche', icon: 'Search', order: 1 }),
      extension('sites-tree', '@egen/esm-sites-app', { title: 'Sites', icon: 'MapPin' }),
      extension('broken', '@egen/esm-annuaire-app', { icon: 'Users' }),
    ],
    'shell-rail-bottom-slot': [
      extension('terminal', '@egen/esm-annuaire-app', { title: 'Terminal', icon: 'Terminal' }),
    ],
    'shell-rail-right-slot': [extension('notifications', '@egen/esm-notifications-app', { title: 'Notifications' })],
  };
  vi.mocked(useAssignedExtensions).mockImplementation((slot: string) => slots[slot] ?? []);
  vi.mocked(ExtensionSlot).mockImplementation((({ name, select }: any) => (
    <div data-testid={`slot-${name}`}>
      {(select ? select(slots[name] ?? []) : (slots[name] ?? [])).map((e: AssignedExtension) => (
        <span key={e.name}>{`content:${e.name}`}</span>
      ))}
    </div>
  )) as any);
  workbenchBadgeStore.setState({}, true);
  window.localStorage.clear();
  document.documentElement.removeAttribute('style');
  workbenchStore.setState(
    {
      sizes: { ...DEFAULT_ZONE_SIZES },
      active: { left: null, right: null, bottom: null },
    },
    true,
  );
});

describe('store du plan de travail', () => {
  it("ouvre puis referme une fenêtre d'outils au second clic", () => {
    toggleToolWindow('left', 'annuaire-tree');
    expect(workbenchStore.getState().active.left).toBe('annuaire-tree');
    toggleToolWindow('left', 'annuaire-tree');
    expect(workbenchStore.getState().active.left).toBeNull();
  });

  it("remplace la fenêtre active d'une zone sans toucher aux autres", () => {
    toggleToolWindow('left', 'a');
    toggleToolWindow('right', 'n');
    toggleToolWindow('left', 'b');
    expect(workbenchStore.getState().active).toEqual({ left: 'b', right: 'n', bottom: null });
  });

  it('closeToolWindow replie la zone', () => {
    toggleToolWindow('bottom', 'terminal');
    closeToolWindow('bottom');
    expect(workbenchStore.getState().active.bottom).toBeNull();
  });

  it('borne la taille des zones et plafonne à une part de la fenêtre', () => {
    expect(clampZoneSize('left', 10, { width: 1920, height: 1080 })).toBe(200);
    expect(clampZoneSize('left', 5000, { width: 1920, height: 1080 })).toBe(640);
    expect(clampZoneSize('left', 5000, { width: 800, height: 600 })).toBe(400); // 50 % de 800
    expect(clampZoneSize('bottom', 5000, { width: 1920, height: 600 })).toBe(420); // 70 % de 600
    expect(clampZoneSize('right', Number.NaN)).toBe(DEFAULT_ZONE_SIZES.right);
  });

  it('setZoneSize / resetZoneSize modifient la taille bornée', () => {
    setZoneSize('right', 400);
    expect(workbenchStore.getState().sizes.right).toBe(400);
    resetZoneSize('right');
    expect(workbenchStore.getState().sizes.right).toBe(DEFAULT_ZONE_SIZES.right);
  });

  it('mémorise la disposition dans le navigateur', () => {
    setZoneSize('left', 333);
    toggleToolWindow('left', 'annuaire-tree');
    const saved = JSON.parse(window.localStorage.getItem(WORKBENCH_STORAGE_KEY) ?? '{}');
    expect(saved.sizes.left).toBe(333);
    expect(saved.active.left).toBe('annuaire-tree');
  });
});

describe('rails', () => {
  it('rail droit : une option de la zone basse (meta.rail = right) vit en bas du rail droit, pas du gauche', () => {
    slots['shell-rail-bottom-slot'].push(
      extension('flash', '@egen/esm-annuaire-app', { title: 'Flash info', icon: 'Megaphone', rail: 'right' }),
    );
    const { unmount } = render(<RightRail />);
    const bottomRight = within(screen.getByRole('group', { name: 'Panneau inférieur' }));
    expect(bottomRight.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Flash info']);
    unmount();
    render(<LeftRail />);
    const bottomLeft = within(screen.getByRole('group', { name: 'Panneau inférieur' }));
    expect(bottomLeft.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Terminal']);
  });

  it("rail gauche : seulement les fenêtres de l'app active, triées, meta invalide ignorée", () => {
    render(<LeftRail />);
    const side = within(screen.getByRole('group', { name: 'Panneau latéral' }));
    expect(side.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Recherche', 'Annuaire']);
    const bottom = within(screen.getByRole('group', { name: 'Panneau inférieur' }));
    expect(bottom.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Terminal']);
  });

  it("rail gauche : le contenu change avec l'app active", () => {
    mounted.apps = ['@egen/esm-sites-app-page-0'];
    render(<LeftRail />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Sites']);
  });

  it("rail gauche : une fenêtre `global` reste affichée quelle que soit l'app active", () => {
    slots['shell-rail-left-slot'].push(
      extension('annuaire-global', '@egen/esm-annuaire-app', { title: 'Annuaire global', icon: 'Users', global: true }),
    );
    mounted.apps = ['@egen/esm-sites-app-page-0'];
    render(<LeftRail />);
    // Sans `order`, l'ordre est celui du slot : l'option globale vient après `sites-tree`.
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sites',
      'Annuaire global',
    ]);
    mounted.apps = [];
    cleanup();
    render(<LeftRail />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Annuaire global']);
  });

  it("rail droit : global, indépendant de l'app active", () => {
    mounted.apps = [];
    render(<RightRail />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('un clic ouvre la zone (aria-pressed) et un second clic la referme', () => {
    render(<LeftRail />);
    const button = screen.getByRole('button', { name: 'Annuaire' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(workbenchStore.getState().active.left).toBe('annuaire-tree');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('un bouton du groupe bas charge la zone basse, pas la zone gauche', () => {
    render(<LeftRail />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminal' }));
    expect(workbenchStore.getState().active).toEqual({ left: null, right: null, bottom: 'terminal' });
  });

  it("affiche l'initiale du titre quand l'icône est inconnue ou absente", () => {
    render(<RightRail />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveTextContent('N');
  });
});

describe('zones', () => {
  it("replie la zone (taille 0, masquée) tant qu'aucune fenêtre n'est active", () => {
    render(<ToolWindowZone anchor="left" />);
    expect(screen.getByTestId('workbench-zone-left')).not.toBeVisible();
    expect(document.documentElement.style.getPropertyValue('--egen-zone-left-width')).toBe('0px');
  });

  it('affiche seulement la fenêtre active, publie la taille et propose la fermeture', () => {
    workbenchStore.setState({ active: { left: 'annuaire-tree', right: null, bottom: null } });
    render(<ToolWindowZone anchor="left" />);
    expect(screen.getByRole('heading', { name: 'Annuaire' })).toBeInTheDocument();
    expect(screen.getByText('content:annuaire-tree')).toBeInTheDocument();
    expect(screen.getByTestId('workbench-zone-left').querySelector('header [data-tool-window-header]')).not.toBeNull();
    expect(screen.queryByText('content:annuaire-search')).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--egen-zone-left-width')).toBe(
      `${DEFAULT_ZONE_SIZES.left}px`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fermer Annuaire' }));
    expect(workbenchStore.getState().active.left).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--egen-zone-left-width')).toBe('0px');
  });

  it("se replie seule quand la fenêtre active n'appartient plus à l'app montée", () => {
    workbenchStore.setState({ active: { left: 'sites-tree', right: null, bottom: null } });
    render(<ToolWindowZone anchor="left" />);
    expect(screen.getByTestId('workbench-zone-left')).not.toBeVisible();
    expect(document.documentElement.style.getPropertyValue('--egen-zone-left-width')).toBe('0px');
  });

  it('la zone basse publie sa hauteur', () => {
    workbenchStore.setState({ active: { left: null, right: null, bottom: 'terminal' } });
    render(<ToolWindowZone anchor="bottom" />);
    expect(document.documentElement.style.getPropertyValue('--egen-zone-bottom-height')).toBe(
      `${DEFAULT_ZONE_SIZES.bottom}px`,
    );
  });
});

describe('poignée de redimensionnement', () => {
  function openLeftZone() {
    workbenchStore.setState({ active: { left: 'annuaire-tree', right: null, bottom: null } });
    render(
      <div data-testid="cell">
        <ToolWindowZone anchor="left" />
      </div>,
    );
    return screen.getByRole('separator');
  }

  it('est un séparateur accessible avec sa valeur courante', () => {
    const handle = openLeftZone();
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(DEFAULT_ZONE_SIZES.left);
  });

  it('se redimensionne au clavier (flèches) et revient au défaut au double-clic', () => {
    const handle = openLeftZone();
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(workbenchStore.getState().sizes.left).toBe(DEFAULT_ZONE_SIZES.left + 16);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(workbenchStore.getState().sizes.left).toBe(DEFAULT_ZONE_SIZES.left - 16);
    fireEvent.doubleClick(handle);
    expect(workbenchStore.getState().sizes.left).toBe(DEFAULT_ZONE_SIZES.left);
  });

  it('se redimensionne au glisser depuis le bord fixe de la zone', () => {
    const handle = openLeftZone();
    const cell = screen.getByTestId('cell');
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ left: 40, right: 320, top: 0, bottom: 600 } as DOMRect);

    fireEvent.pointerDown(handle, { button: 0, clientX: 320, clientY: 100 });
    expect(document.documentElement).toHaveAttribute('data-workbench-resizing', 'left');
    fireEvent.pointerMove(handle, { clientX: 440, clientY: 100 });
    expect(workbenchStore.getState().sizes.left).toBe(400); // 440 - 40
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 100 });
    expect(workbenchStore.getState().sizes.left).toBe(200); // borné au minimum
    fireEvent.pointerUp(handle);
    expect(document.documentElement).not.toHaveAttribute('data-workbench-resizing');

    fireEvent.pointerMove(handle, { clientX: 500, clientY: 100 });
    expect(workbenchStore.getState().sizes.left).toBe(200); // plus de glisser en cours
  });

  it('la frontière suit le pointeur sans saut, même si la poignée est saisie à côté de son centre', () => {
    const handle = openLeftZone();
    vi.spyOn(screen.getByTestId('cell'), 'getBoundingClientRect').mockReturnValue({
      left: 40,
      right: 320,
      top: 0,
      bottom: 600,
    } as DOMRect);

    // Saisie 4px au-delà de la frontière (320) : un mouvement nul ne change pas la taille.
    fireEvent.pointerDown(handle, { button: 0, clientX: 324, clientY: 100 });
    fireEvent.pointerMove(handle, { clientX: 324, clientY: 100 });
    expect(workbenchStore.getState().sizes.left).toBe(DEFAULT_ZONE_SIZES.left);
    // Puis la frontière avance exactement comme le pointeur : +120px.
    fireEvent.pointerMove(handle, { clientX: 444, clientY: 100 });
    expect(workbenchStore.getState().sizes.left).toBe(DEFAULT_ZONE_SIZES.left + 120);
    fireEvent.pointerUp(handle);
  });

  it('zone droite : le glisser vers la gauche agrandit', () => {
    workbenchStore.setState({ active: { left: null, right: 'notifications', bottom: null } });
    render(
      <div data-testid="cell">
        <ToolWindowZone anchor="right" />
      </div>,
    );
    vi.spyOn(screen.getByTestId('cell'), 'getBoundingClientRect').mockReturnValue({
      left: 1500,
      right: 1880,
      top: 0,
      bottom: 600,
    } as DOMRect);
    const handle = screen.getByRole('separator');
    fireEvent.pointerDown(handle, { button: 0, clientX: 1500 });
    fireEvent.pointerMove(handle, { clientX: 1400 });
    expect(workbenchStore.getState().sizes.right).toBe(480); // 1880 - 1400
  });
});

describe('pastilles des boutons de rail', () => {
  it("affiche la pastille publiée pour une fenêtre d'outils et la retire à 0", () => {
    render(<RightRail />);
    expect(screen.queryByTestId('workbench-badge-notifications')).toBeNull();
    act(() => setToolWindowBadge('notifications', 3));
    expect(screen.getByTestId('workbench-badge-notifications').textContent).toBe('3');
    act(() => setToolWindowBadge('notifications', 0));
    expect(screen.queryByTestId('workbench-badge-notifications')).toBeNull();
    expect(workbenchBadgeStore.getState()).toEqual({});
  });

  it('plafonne les grands nombres à 99+', () => {
    expect(formatToolWindowBadge(7)).toBe('7');
    expect(formatToolWindowBadge(100)).toBe('99+');
    expect(formatToolWindowBadge('new')).toBe('new');
  });

  it('ne mémorise jamais les pastilles avec la disposition', () => {
    setToolWindowBadge('notifications', 5);
    expect(window.localStorage.getItem(WORKBENCH_STORAGE_KEY) ?? '').not.toContain('notifications');
  });
});

describe('contexte de composant des zones', () => {
  it("fournit un ComponentContext à l'ExtensionSlot de la zone (sinon useExtensionSlot lève une erreur)", () => {
    let received: { moduleName?: string } | null = null;
    vi.mocked(ExtensionSlot).mockImplementation((() => {
      received = useContext(ComponentContext) as { moduleName?: string } | null;
      return null;
    }) as any);
    workbenchStore.setState({ active: { left: null, right: 'notifications', bottom: null } });
    render(<ToolWindowZone anchor="right" />);
    expect(received?.moduleName).toBeTruthy();
  });
});
