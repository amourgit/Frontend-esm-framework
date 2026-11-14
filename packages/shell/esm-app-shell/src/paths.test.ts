import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SpaConfig } from '@egen-civitas/esm-framework/src/internal';
import { resolveApiUrl, setupPaths } from './paths';

const config = (overrides: Partial<SpaConfig>) => ({ apiUrl: '/egen', spaPath: '/egen-civitas/spa', ...overrides }) as SpaConfig;
const fakeWindow = () => ({}) as unknown as Window;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('setupPaths (B6)', () => {
  it('natif : spaPath /app et apiUrl absolue sont posés tels quels, en lecture seule', () => {
    const win = fakeWindow();
    setupPaths(config({ apiUrl: 'https://api.exemple.ga/egen', spaPath: '/app' }), win);

    expect(win.egenBase).toBe('https://api.exemple.ga/egen');
    expect(win.spaBase).toBe('/app');
    expect(win.getEgenSpaBase()).toBe('/app/');
    expect(() => {
      'use strict';
      (win as unknown as Record<string, unknown>).egenBase = 'https://pirate.test';
    }).toThrow();
    expect(win.egenBase).toBe('https://api.exemple.ga/egen');
  });

  it('web : base relative et chemin avec slash final inchangés', () => {
    const win = fakeWindow();
    setupPaths(config({ spaPath: '/egen-civitas/spa/' }), win);

    expect(win.egenBase).toBe('/egen');
    expect(win.getEgenSpaBase()).toBe('/egen-civitas/spa/');
    expect(win.spaEnv).toBe('production');
  });

  it("refuse une configuration sans apiUrl ni spaPath et l'explique en console", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => setupPaths(config({ apiUrl: '', spaPath: '' }), fakeWindow())).toThrow(/required properties/);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe('resolveApiUrl (B6 : run.ts construit l’URL de session)', () => {
  it('base absolue (natif) : conservée, indépendante de l’origine du WebView', () => {
    expect(resolveApiUrl('/ws/rest/v1/session', 'https://api.exemple.ga/egen', 'http://localhost')).toBe(
      'https://api.exemple.ga/egen/ws/rest/v1/session',
    );
  });

  it('base relative (Web) : résolue contre l’origine de la page', () => {
    expect(resolveApiUrl('/ws/rest/v1/session', '/egen', 'https://app.exemple.ga')).toBe(
      'https://app.exemple.ga/egen/ws/rest/v1/session',
    );
  });
});
