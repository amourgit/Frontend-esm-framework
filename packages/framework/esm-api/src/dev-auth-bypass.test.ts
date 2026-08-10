import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { sessionStore, clearCurrentUser } from './current-user';

describe('dev-auth-bypass', () => {
  const originalFetch = window.fetch;

  beforeEach(() => {
    vi.resetModules();
    clearCurrentUser();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCurrentUser();
    // window.fetch est un global réel, non réinitialisé par vi.resetModules() —
    // sans ceci, une interception installée par un test resterait active
    // (et pointerait vers un module déjà "reset") dans le test suivant.
    window.fetch = originalFetch;
  });

  describe('isDevAuthBypassEnabled', () => {
    it('retourne false quand EGEN_DEV_NO_AUTH est absent', async () => {
      vi.unstubAllEnvs();
      const { isDevAuthBypassEnabled } = await import('./dev-auth-bypass');
      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it('retourne true quand EGEN_DEV_NO_AUTH=true', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { isDevAuthBypassEnabled } = await import('./dev-auth-bypass');
      expect(isDevAuthBypassEnabled()).toBe(true);
    });
  });

  describe('initDevAuthBypass', () => {
    it('ne fait rien si le bypass est désactivé', async () => {
      vi.unstubAllEnvs();
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      initDevAuthBypass();
      expect(sessionStore.getState().loaded).toBe(false);
    });

    it("peuple IMMÉDIATEMENT le sessionStore au boot — pas besoin de soumettre le formulaire de login", async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass } = await import('./dev-auth-bypass');

      // Avant tout montage d'app, avant tout appel à getSessionStore()/useSession() :
      initDevAuthBypass();

      const state = sessionStore.getState();
      expect(state.loaded).toBe(true);
      expect(state.session?.authenticated).toBe(true);
      expect(state.session?.user?.display).toBeTruthy();
    });

    it('la session injectée est exploitable par tout code lisant sessionStore directement (simulation multi-app)', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      initDevAuthBypass();

      // Simule un package qui n'a jamais touché à /login (ex: esm-ai-assistant-app) :
      // lit sessionStore comme le ferait useSession()/getSessionStore().
      const state = sessionStore.getState();
      expect(state.loaded).toBe(true);
      expect(state.session?.authenticated).toBe(true);
    });
  });

  describe('applyDevAuthBypassForLogin', () => {
    it('retourne null si le bypass est désactivé', async () => {
      vi.unstubAllEnvs();
      const { applyDevAuthBypassForLogin } = await import('./dev-auth-bypass');
      expect(applyDevAuthBypassForLogin()).toBeNull();
    });

    it('reste fonctionnel pour le flux explicite de soumission du formulaire', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { applyDevAuthBypassForLogin } = await import('./dev-auth-bypass');
      const result = applyDevAuthBypassForLogin();
      expect(result?.loaded).toBe(true);
      expect(result?.session?.authenticated).toBe(true);
      expect(sessionStore.getState().session?.authenticated).toBe(true);
    });
  });

  describe('interceptSessionFetch', () => {
    it('intercepte le fetch du session endpoint et retourne la session fictive', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { interceptSessionFetch, DEV_BYPASS_SESSION } = await import('./dev-auth-bypass');
      interceptSessionFetch();

      const response = await window.fetch('/openmrs/ws/rest/v1/session');
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(true);
      expect(data.user.uuid).toBe(DEV_BYPASS_SESSION.user.uuid);
    });

    it('un DELETE /session (logout) déconnecte réellement — les GET suivants ne re-authentifient plus', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      initDevAuthBypass();
      expect(sessionStore.getState().session?.authenticated).toBe(true);

      // Simule exactement le flux réel de performLogout() :
      // esm-login-app/src/redirect-logout/logout.resource.ts
      await window.fetch('/openmrs/ws/rest/v1/session', { method: 'DELETE' });
      clearCurrentUser();

      // refetchCurrentUser() est appelé juste après dans performLogout() —
      // avant le correctif, ce GET ré-authentifiait silencieusement
      // l'utilisateur au lieu de confirmer la déconnexion.
      const response = await window.fetch('/openmrs/ws/rest/v1/session');
      const data = await response.json();
      expect(data.authenticated).toBe(false);
    });

    it('une nouvelle soumission du formulaire de login réauthentifie après un logout', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass, applyDevAuthBypassForLogin } = await import('./dev-auth-bypass');
      initDevAuthBypass();

      await window.fetch('/openmrs/ws/rest/v1/session', { method: 'DELETE' });
      let response = await window.fetch('/openmrs/ws/rest/v1/session');
      expect((await response.json()).authenticated).toBe(false);

      applyDevAuthBypassForLogin();
      response = await window.fetch('/openmrs/ws/rest/v1/session');
      expect((await response.json()).authenticated).toBe(true);
    });
  });
});
