import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F1 — Lockdown natif : même en « development », une cible native ignore tous les overrides d'import map
 * et de route map (aucun code non prévu ne peut être chargé).
 */
describe('lockdown des overrides (cibles natives)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    document.querySelectorAll('script[type="systemjs-importmap"]').forEach((el) => el.remove());
    const script = document.createElement('script');
    script.type = 'systemjs-importmap';
    script.textContent = JSON.stringify({ imports: { '@egen/esm-foo': '/foo.js' } });
    document.head.appendChild(script);
  });

  afterEach(() => {
    delete (window as { egenTarget?: unknown }).egenTarget;
    (window as unknown as { spaEnv?: string }).spaEnv = undefined;
    localStorage.clear();
  });

  it.each(['android', 'ios'] as const)(
    '%s : import map — override localStorage ignoré en development',
    async (target) => {
      window.egenTarget = target;
      (window as unknown as { spaEnv: string }).spaEnv = 'development';
      localStorage.setItem('import-map-override:@egen/esm-foo', 'https://evil.example/foo.js');

      const { setupImportMapOverrides, getCurrentPageMap, addImportMapOverride } = await import('./import-maps');
      setupImportMapOverrides();
      addImportMapOverride('@egen/esm-foo', 'https://evil.example/other.js'); // doit être un no-op

      const map = await getCurrentPageMap();
      expect(map.imports['@egen/esm-foo']).toBe('/foo.js');
      expect(localStorage.getItem('import-map-override:@egen/esm-foo')).toBe('https://evil.example/foo.js'); // non modifié
    },
  );

  it('web : import map — override honoré en development (non-régression)', async () => {
    (window as unknown as { spaEnv: string }).spaEnv = 'development';
    localStorage.setItem('import-map-override:@egen/esm-foo', 'http://localhost:8082/foo.js');

    const { setupImportMapOverrides, getCurrentPageMap } = await import('./import-maps');
    setupImportMapOverrides();

    expect((await getCurrentPageMap()).imports['@egen/esm-foo']).toBe('http://localhost:8082/foo.js');
  });

  it.each(['android', 'ios'] as const)('%s : route map — overrides désactivés en development', async (target) => {
    window.egenTarget = target;
    (window as unknown as { spaEnv: string }).spaEnv = 'development';

    const { setupRouteMapOverrides, addRouteMapOverride, getRouteMapOverrideMap } = await import('./route-maps');
    await setupRouteMapOverrides();
    addRouteMapOverride('@egen/esm-foo', { pages: [] } as never);

    expect(getRouteMapOverrideMap()).toEqual({});
  });
});
