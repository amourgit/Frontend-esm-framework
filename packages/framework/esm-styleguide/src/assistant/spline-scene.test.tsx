import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const splineLoaded = vi.fn();
vi.mock('@splinetool/react-spline', () => {
  splineLoaded();
  return { default: () => <canvas data-testid="spline-canvas" /> };
});

import { SplineScene, preloadSplineScene } from './spline-scene.component';

const w = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete w.egenTarget;
  vi.restoreAllMocks();
  splineLoaded.mockClear();
});

describe('SplineScene : le runtime 3D est incompatible avec la CSP native (unsafe-eval, wasm)', () => {
  it.each(['android', 'ios'])('%s : ne charge pas Spline et rend un conteneur vide, de même classe', async (target) => {
    w.egenTarget = target;
    render(<SplineScene scene="https://exemple.ga/scene.splinecode" className="h-40 w-40" />);
    // Laisser une chance à un éventuel import paresseux de s'exécuter.
    await new Promise((resolve) => setTimeout(resolve, 20));
    const root = screen.getByTestId('spline-unavailable');
    expect(root).toHaveAttribute('data-egen-3d', 'unavailable');
    expect(root).toHaveClass('h-40');
    expect(root).toBeEmptyDOMElement();
    expect(screen.queryByTestId('spline-canvas')).not.toBeInTheDocument();
    expect(splineLoaded).not.toHaveBeenCalled();
  });

  it('natif : preloadSplineScene ne télécharge rien (aucun <link> ajouté au document)', () => {
    w.egenTarget = 'android';
    const append = vi.spyOn(HTMLHeadElement.prototype, 'appendChild');
    preloadSplineScene('https://exemple.ga/scene-native.splinecode');
    expect(append).not.toHaveBeenCalled();
  });

  it('web : comportement inchangé (chargement paresseux de Spline, pas de conteneur natif)', async () => {
    render(<SplineScene scene="https://exemple.ga/scene.splinecode" />);
    expect(screen.queryByTestId('spline-unavailable')).not.toBeInTheDocument();
    expect(await screen.findByTestId('spline-canvas')).toBeInTheDocument();
    expect(splineLoaded).toHaveBeenCalled();
  });

  it('web : preloadSplineScene ajoute le <link rel="preload">, une seule fois par URL', () => {
    const append = vi.spyOn(HTMLHeadElement.prototype, 'appendChild');
    preloadSplineScene('https://exemple.ga/scene-web.splinecode');
    preloadSplineScene('https://exemple.ga/scene-web.splinecode');
    expect(append).toHaveBeenCalledTimes(1);
    const link = append.mock.calls[0][0] as HTMLLinkElement;
    expect(link).toMatchObject({ rel: 'preload', href: 'https://exemple.ga/scene-web.splinecode' });
  });
});
