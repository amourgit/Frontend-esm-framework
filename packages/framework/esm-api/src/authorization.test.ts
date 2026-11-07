import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '@egen-civitas/esm-config';
import { navigate } from '@egen-civitas/esm-navigation';
import { egenFetch } from './egen-fetch';
import { setAuthorizationProvider, type AuthorizationProvider } from './authorization';

vi.mock('@egen-civitas/esm-navigation', () => ({
  clearHistory: vi.fn(),
  navigate: vi.fn(),
}));

const mockGetConfig = vi.mocked(getConfig);
const mockNavigate = vi.mocked(navigate);
const mockFetch = () => vi.mocked(window.fetch);

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function unauthorized() {
  return new Response('', { status: 401 });
}

function sentAuthorization(callIndex: number): string | undefined {
  const init = mockFetch().mock.calls[callIndex][1] as { headers: Record<string, string> };
  return init.headers.Authorization;
}

function provider(overrides: Partial<AuthorizationProvider> = {}): AuthorizationProvider {
  return {
    getAuthorization: vi.fn().mockResolvedValue('Bearer token-1'),
    ...overrides,
  };
}

describe("egenFetch — fournisseur d'autorisation (cibles natives)", () => {
  beforeEach(() => {
    mockGetConfig.mockReturnValue(
      Promise.resolve({
        redirectAuthFailure: { enabled: true, url: '${egenSpaBase}/login', errors: [401], resolvePromise: false },
      }),
    );
    window.egenBase = '/egen-civitas';
    window.getEgenSpaBase = () => '/egen-civitas/spa/';
    window.fetch = vi.fn();
  });

  afterEach(() => {
    setAuthorizationProvider(null);
    mockNavigate.mockClear();
    // @ts-expect-error Not normally deletable
    delete window.egenBase;
    // @ts-expect-error Not normally deletable
    delete window.getEgenSpaBase;
  });

  describe('sans fournisseur (comportement Web historique)', () => {
    it('appelle fetch de façon synchrone, sans Authorization ni credentials', async () => {
      mockFetch().mockResolvedValue(ok());

      const promise = egenFetch('/ws/rest/v1/session');
      expect(mockFetch()).toHaveBeenCalledTimes(1); // synchrone : pas d'await avant fetch
      await promise;

      const init = mockFetch().mock.calls[0][1] as { headers: Record<string, string>; credentials?: string };
      expect(init.headers.Authorization).toBeUndefined();
      expect(init.credentials).toBeUndefined();
    });
  });

  describe('injection', () => {
    it("ajoute l'en-tête Authorization fourni", async () => {
      setAuthorizationProvider(provider());
      mockFetch().mockResolvedValue(ok());

      await egenFetch('/ws/rest/v1/patient');

      expect(sentAuthorization(0)).toBe('Bearer token-1');
    });

    it("applique la politique credentials du fournisseur sauf si l'appelant en fixe une", async () => {
      setAuthorizationProvider(provider({ credentials: 'omit' }));
      mockFetch().mockResolvedValue(ok());

      await egenFetch('/a');
      await egenFetch('/b', { credentials: 'include' });

      expect((mockFetch().mock.calls[0][1] as RequestInit).credentials).toBe('omit');
      expect((mockFetch().mock.calls[1][1] as RequestInit).credentials).toBe('include');
    });

    it("ne remplace pas un en-tête Authorization fourni par l'appelant (casse ignorée)", async () => {
      const p = provider();
      setAuthorizationProvider(p);
      mockFetch().mockResolvedValue(ok());

      await egenFetch('/a', { headers: { authorization: 'Basic abc' } });

      expect(p.getAuthorization).not.toHaveBeenCalled();
      const init = mockFetch().mock.calls[0][1] as { headers: Record<string, string> };
      expect(init.headers.authorization).toBe('Basic abc');
      expect(init.headers.Authorization).toBeUndefined();
    });

    it("n'ajoute rien quand il n'y a pas de session (null)", async () => {
      setAuthorizationProvider(provider({ getAuthorization: vi.fn().mockResolvedValue(null) }));
      mockFetch().mockResolvedValue(ok());

      await egenFetch('/a');

      expect(sentAuthorization(0)).toBeUndefined();
    });

    it("propage l'erreur du fournisseur sans appeler fetch", async () => {
      const failure = new Error('hôte indisponible');
      setAuthorizationProvider(provider({ getAuthorization: vi.fn().mockRejectedValue(failure) }));

      await expect(egenFetch('/a')).rejects.toBe(failure);
      expect(mockFetch()).not.toHaveBeenCalled();
    });
  });

  describe('HTTP 401 : rafraîchissement unique puis rejeu', () => {
    it('rafraîchit puis rejoue la requête GET une fois avec le nouveau jeton', async () => {
      const getAuthorization = vi.fn().mockResolvedValueOnce('Bearer old').mockResolvedValueOnce('Bearer new');
      const refresh = vi.fn().mockResolvedValue(true);
      setAuthorizationProvider({ getAuthorization, refresh });
      mockFetch()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(ok({ done: true }));

      const response = await egenFetch('/a');

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockFetch()).toHaveBeenCalledTimes(2);
      expect(sentAuthorization(1)).toBe('Bearer new');
      expect(response.data).toEqual({ done: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("5 requêtes simultanées en 401 ne déclenchent qu'UN seul rafraîchissement", async () => {
      let token = 'Bearer old';
      let release!: () => void;
      const refresh = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            release = () => {
              token = 'Bearer new';
              resolve(true);
            };
          }),
      );
      setAuthorizationProvider({ getAuthorization: vi.fn(async () => token), refresh });

      mockFetch().mockImplementation(async (_url, init) => {
        const auth = (init as { headers: Record<string, string> }).headers.Authorization;
        return auth === 'Bearer new' ? ok() : unauthorized();
      });

      const calls = Promise.all(Array.from({ length: 5 }, (_, i) => egenFetch(`/r${i}`, { headers: {} })));
      await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
      release();
      await calls;

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockFetch()).toHaveBeenCalledTimes(10); // 5 premières + 5 rejeux
    });

    it("échec du rafraîchissement : traitement historique (redirection d'authentification)", async () => {
      setAuthorizationProvider(provider({ refresh: vi.fn().mockResolvedValue(false) }));
      mockFetch().mockResolvedValue(unauthorized());

      void egenFetch('/a'); // reste en attente pendant la navigation (comportement existant)
      await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());

      expect(mockFetch()).toHaveBeenCalledTimes(1);
    });

    it('un fournisseur dont refresh() rejette est traité comme un échec de rafraîchissement', async () => {
      setAuthorizationProvider(provider({ refresh: vi.fn().mockRejectedValue(new Error('boom')) }));
      mockFetch().mockResolvedValue(unauthorized());

      void egenFetch('/a');
      await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    });

    it('ne boucle pas : un second 401 après rejeu suit le traitement historique', async () => {
      const refresh = vi.fn().mockResolvedValue(true);
      setAuthorizationProvider(provider({ refresh }));
      mockFetch().mockResolvedValue(unauthorized());

      void egenFetch('/a');
      await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockFetch()).toHaveBeenCalledTimes(2);
    });

    it('ne rejoue pas un POST par défaut', async () => {
      const refresh = vi.fn().mockResolvedValue(true);
      setAuthorizationProvider(provider({ refresh }));
      mockFetch().mockResolvedValue(unauthorized());

      void egenFetch('/a', { method: 'POST', body: { x: 1 } });
      await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());

      expect(refresh).not.toHaveBeenCalled();
      expect(mockFetch()).toHaveBeenCalledTimes(1);
    });

    it('rejoue un POST si replayOnUnauthorized est demandé', async () => {
      const refresh = vi.fn().mockResolvedValue(true);
      setAuthorizationProvider(provider({ refresh }));
      mockFetch().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok());

      await egenFetch('/a', { method: 'POST', body: { x: 1 }, replayOnUnauthorized: true });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockFetch()).toHaveBeenCalledTimes(2);
    });

    it("ne rafraîchit pas quand le jeton a été fourni par l'appelant", async () => {
      const refresh = vi.fn().mockResolvedValue(true);
      setAuthorizationProvider(provider({ refresh }));
      mockFetch().mockResolvedValue(unauthorized());

      void egenFetch('/a', { headers: { Authorization: 'Bearer caller' } });
      await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());

      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe('journalisation sûre', () => {
    it("n'expose jamais le jeton dans l'erreur (message, stack, corps)", async () => {
      setAuthorizationProvider(provider({ getAuthorization: vi.fn().mockResolvedValue('Bearer SECRET-TOKEN-XYZ') }));
      mockFetch().mockResolvedValue(new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));

      const error = await egenFetch('/a').then(
        () => null,
        (e) => e,
      );

      expect(error).toBeTruthy();
      const dump = JSON.stringify({ message: error.message, stack: error.stack, body: error.responseBody });
      expect(dump).not.toContain('SECRET-TOKEN-XYZ');
    });
  });
});
