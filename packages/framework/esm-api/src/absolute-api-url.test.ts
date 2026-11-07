import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '@egen-civitas/esm-config';
import { egenFetch, makeUrl, sessionEndpoint } from './egen-fetch';

vi.mock('@egen-civitas/esm-navigation', () => ({
  clearHistory: vi.fn(),
  navigate: vi.fn(),
}));

/**
 * Cibles natives : l'API est servie depuis un autre domaine que l'origine locale du SPA.
 * `window.egenBase` est alors une URL absolue https:// — `makeUrl` et `egenFetch` doivent la respecter telle quelle.
 */
describe("URL d'API absolue (cibles natives)", () => {
  const absoluteBase = 'https://api.exemple.ga/egen';

  beforeEach(() => {
    vi.mocked(getConfig).mockReturnValue(
      Promise.resolve({ redirectAuthFailure: { enabled: false, url: '', errors: [], resolvePromise: false } }),
    );
    window.egenBase = absoluteBase;
    window.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    // @ts-expect-error Not normally deletable
    delete window.egenBase;
  });

  it('makeUrl préfixe avec la base absolue', () => {
    expect(makeUrl('/ws/rest/v1/patient')).toBe(`${absoluteBase}/ws/rest/v1/patient`);
    expect(makeUrl('ws/rest/v1/patient')).toBe(`${absoluteBase}/ws/rest/v1/patient`);
  });

  it('makeUrl laisse intacte une URL déjà absolue', () => {
    expect(makeUrl('https://autre.exemple.ga/x')).toBe('https://autre.exemple.ga/x');
  });

  it("egenFetch appelle l'URL absolue complète", async () => {
    await egenFetch(sessionEndpoint);

    expect(vi.mocked(window.fetch).mock.calls[0][0]).toBe(`${absoluteBase}${sessionEndpoint}`);
  });

  it("l'expression utilisée par le shell pour l'URL de session reste absolue avec une base absolue", () => {
    // Reproduit `new URL(`${window.egenBase}${restBaseUrl}/session`, window.location.origin)` (esm-app-shell/src/run.ts).
    const href = new URL(`${window.egenBase}/ws/rest/v1/session`, 'https://localhost').href;
    expect(href).toBe('https://api.exemple.ga/egen/ws/rest/v1/session');
  });
});
