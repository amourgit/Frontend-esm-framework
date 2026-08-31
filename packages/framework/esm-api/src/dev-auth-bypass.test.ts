import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { clearCurrentUser } from './current-user';

// NOTE IMPORTANTE sur vi.resetModules() dans ce fichier : chaque test importe
// dynamiquement `./dev-auth-bypass` (et souvent `./current-user`) APRÈS
// vi.resetModules(), pour repartir d'un état de module frais. Une valeur
// obtenue via un import STATIQUE en tête de fichier (comme `clearCurrentUser`
// ci-dessus) reste liée à la génération de modules chargée avant tout reset —
// donc jamais au même `sessionStore` que celui que `dev-auth-bypass` frais
// écrit réellement. Tout test qui a besoin de lire ou d'écrire `sessionStore`
// doit l'obtenir via `await import('./current-user')` DANS le test, à côté de
// l'import de `dev-auth-bypass` — jamais via l'import statique du haut du
// fichier, qui ne convient qu'à `beforeEach`/`afterEach` (nettoyage sur la
// génération précédente, sans conséquence puisqu'une nouvelle génération
// repart de toute façon d'un store vierge à chaque `vi.resetModules()`).

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
    // Idem pour le pont runtime : sans ce nettoyage, un test qui pose
    // window.egenDevNoAuth = true ferait fuiter le bypass dans les tests
    // suivants.
    delete (window as { egenDevNoAuth?: boolean }).egenDevNoAuth;
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

    it(
      'retourne true via window.egenDevNoAuth même sans EGEN_DEV_NO_AUTH dans ' +
        "l'environnement — cas d'esm-app-shell consommé comme paquet npm " +
        'pré-compilé, où seul un pont runtime posé par `egen develop` peut ' +
        'encore activer le bypass (voir packages/tooling/egen/src/commands/develop.ts ' +
        'côté framework)',
      async () => {
        vi.unstubAllEnvs();
        (window as { egenDevNoAuth?: boolean }).egenDevNoAuth = true;
        const { isDevAuthBypassEnabled } = await import('./dev-auth-bypass');
        expect(isDevAuthBypassEnabled()).toBe(true);
      },
    );
  });

  describe('initDevAuthBypass', () => {
    it('ne fait rien si le bypass est désactivé', async () => {
      vi.unstubAllEnvs();
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      // sessionStore doit venir du MÊME import dynamique (donc de la même
      // génération de registre de modules post-vi.resetModules()) que le
      // reste de ce test — voir la note en tête de fichier.
      const { sessionStore: freshSessionStore } = await import('./current-user');
      initDevAuthBypass();
      expect(freshSessionStore.getState().loaded).toBe(false);
    });

    it("peuple IMMÉDIATEMENT le sessionStore au boot — pas besoin de soumettre le formulaire de login", async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      const { sessionStore: freshSessionStore } = await import('./current-user');

      // Avant tout montage d'app, avant tout appel à getSessionStore()/useSession() :
      initDevAuthBypass();

      const state = freshSessionStore.getState();
      expect(state.loaded).toBe(true);
      expect(state.session?.authenticated).toBe(true);
      expect(state.session?.user?.display).toBeTruthy();
    });

    it('la session injectée est exploitable par tout code lisant sessionStore directement (simulation multi-app)', async () => {
      vi.stubEnv('EGEN_DEV_NO_AUTH', 'true');
      const { initDevAuthBypass } = await import('./dev-auth-bypass');
      const { sessionStore: freshSessionStore } = await import('./current-user');
      initDevAuthBypass();

      // Simule un package qui n'a jamais touché à /login (ex: esm-ai-assistant-app) :
      // lit sessionStore comme le ferait useSession()/getSessionStore().
      const state = freshSessionStore.getState();
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
      const { sessionStore: freshSessionStore } = await import('./current-user');
      const result = applyDevAuthBypassForLogin();
      expect(result?.loaded).toBe(true);
      expect(result?.session?.authenticated).toBe(true);
      expect(freshSessionStore.getState().session?.authenticated).toBe(true);
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
      const { sessionStore: freshSessionStore, clearCurrentUser: freshClearCurrentUser } =
        await import('./current-user');
      initDevAuthBypass();
      expect(freshSessionStore.getState().session?.authenticated).toBe(true);

      // Simule exactement le flux réel de performLogout() :
      // esm-login-app/src/redirect-logout/logout.resource.ts
      await window.fetch('/openmrs/ws/rest/v1/session', { method: 'DELETE' });
      freshClearCurrentUser();

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
