import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '@egen-civitas/esm-config';
import { egenFetch } from './egen-fetch';
import { setAuthorizationProvider } from './authorization';

vi.mock('@egen-civitas/esm-navigation', () => ({ clearHistory: vi.fn(), navigate: vi.fn() }));
vi.mock('./tenant.js', () => ({ getTenantId: () => 'mef' }));

/**
 * D6 — contrat CORS (document X-1) : la liste des en-têtes que `egenFetch` ajoute d'office est EXACTEMENT celle que le
 * backend doit autoriser en `Access-Control-Allow-Headers` pour l'origine locale d'une app native. Tout nouvel en-tête
 * automatique doit faire échouer ce test, puis être ajouté à `docs/cors-api-native.md`.
 */
describe('egenFetch — en-têtes automatiques (D6)', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue({ redirectAuthFailure: { enabled: false, errors: [], url: '', resolvePromise: false } });
    window.egenBase = 'https://api.exemple.ga/egen';
    window.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    setAuthorizationProvider(null);
  });

  const sentHeaders = () => Object.keys((vi.mocked(window.fetch).mock.calls[0][1] as RequestInit).headers as object).sort();

  it('natif (fournisseur d’autorisation + tenant actif) : Accept, Authorization, Disable-WWW-Authenticate, X-Tenant-ID', async () => {
    setAuthorizationProvider({
      credentials: 'omit',
      getAuthorization: async () => 'Bearer t1',
      refresh: async () => false,
    });

    egenFetch('/ws/rest/v1/session');
    await vi.waitFor(() => expect(window.fetch).toHaveBeenCalled());

    expect(sentHeaders()).toEqual(['Accept', 'Authorization', 'Disable-WWW-Authenticate', 'X-Tenant-ID']);
  });

  it('web (aucun fournisseur) : mêmes en-têtes sans Authorization (le cookie reste le mécanisme)', () => {
    egenFetch('/ws/rest/v1/session');

    expect(sentHeaders()).toEqual(['Accept', 'Disable-WWW-Authenticate', 'X-Tenant-ID']);
  });
});
