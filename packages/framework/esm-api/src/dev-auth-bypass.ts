// =============================================================================
//  @egen/esm-api — Bypass d'authentification pour développement
//
//  ACTIVÉ via EGEN_DEV_NO_AUTH=true dans l'environnement de build.
//  Ne jamais utiliser en production.
//
//  PHILOSOPHIE : ce mode doit être un cas de connexion RÉEL du point de vue
//  de tout le reste du framework — pas un raccourci propre à une app. Une
//  fois activé, TOUTE app ou package (y compris ceux qui ne touchent jamais
//  à /login, comme esm-ai-assistant-app) doit pouvoir lire un utilisateur
//  authentifié via les mêmes canaux qu'une vraie connexion backend :
//  useSession(), getSessionStore(), getCurrentUser(), getLoggedInUser().
//  Aucun appel réseau n'est jamais fait vers le backend.
//
//  DEUX MÉCANISMES COMPLÉMENTAIRES :
//
//  1. INJECTION IMMÉDIATE AU BOOT (initDevAuthBypass, appelé une seule fois
//     dans esm-app-shell/run.ts, avant le montage de la moindre app) :
//     le sessionStore global (@egen/esm-state, store "session") est peuplé
//     directement et synchrones avec la session fictive — exactement comme
//     s'il venait de recevoir une réponse 200 authentifiée du backend. Toute
//     app qui lit useSession()/getSessionStore() dès son premier rendu voit
//     donc immédiatement un utilisateur connecté, sans jamais passer par
//     /login, sans throw Suspense en attente d'un fetch, et surtout sans
//     dépendre de l'ordre de montage des microfrontends.
//
//     IMPORTANT — PARTAGE MODULE FEDERATION : cette injection n'a d'effet
//     "partout" que si @egen/esm-state est bien partagé en singleton entre
//     le shell et CHAQUE app (shared: { '@egen/esm-state': { singleton: true } }).
//     Sans cela, chaque conteneur fédéré aurait sa propre copie du registre
//     de stores globaux, et cette injection ne serait visible que dans le
//     shell. Voir packages/*/package.json (peerDependencies) et
//     esm-app-shell/dependencies.json — c'est la même exigence que pour le
//     store tenant (voir @egen/esm-tenant/src/context/store.ts).
//
//  2. INTERCEPTION FETCH (filet de sécurité) : intercepte window.fetch pour
//     l'URL du session endpoint, au cas où un code appellerait explicitement
//     refetchCurrentUser()/egenFetch(sessionEndpoint) (ex: après un
//     setUserProperties(), ou un changement de session location). Sans
//     cette interception, un tel appel réseau échouerait (pas de backend)
//     et écraserait la session fictive avec authenticated:false.
// =============================================================================

import { sessionStore, type SessionStore } from './current-user';
import { sessionEndpoint } from './egen-fetch';

// ─── Vérification d'activation ────────────────────────────────────────────────

/**
 * Retourne true si EGEN_DEV_NO_AUTH=true dans l'environnement de build.
 * La variable est injectée par rspack DefinePlugin depuis process.env.EGEN_DEV_NO_AUTH.
 */
export function isDevAuthBypassEnabled(): boolean {
  try {
    return process.env.EGEN_DEV_NO_AUTH === 'true';
  } catch {
    return false;
  }
}

// ─── Session fictive partagée ─────────────────────────────────────────────────

/**
 * Session admin fictive utilisée par tous les mécanismes de bypass.
 * Correspond exactement à la forme Session attendue par handleSessionResponse.
 */
export const DEV_BYPASS_SESSION = {
  authenticated: true,
  sessionId: 'dev-bypass-session',
  locale: 'fr',
  allowedLocales: ['fr', 'en'],
  user: {
    uuid: 'dev-user-uuid',
    display: 'Administrateur (Dev)',
    username: 'dev-admin',
    systemId: 'dev-admin',
    locale: 'fr',
    allowedLocales: ['fr', 'en'],
    userProperties: { defaultLocale: 'fr' },
    person: {
      uuid: 'dev-person-uuid',
      display: 'Administrateur Dev',
      links: [],
    },
    privileges: [
      { uuid: 'p1', name: 'Get Users', display: 'Get Users', links: [] },
      { uuid: 'p2', name: 'Edit Users', display: 'Edit Users', links: [] },
      { uuid: 'p3', name: 'Get Records', display: 'Get Records', links: [] },
      { uuid: 'p4', name: 'System Developer', display: 'System Developer', links: [] },
    ],
    roles: [
      { uuid: 'r1', display: 'System Developer', name: 'System Developer', links: [] },
      { uuid: 'r2', display: 'Administrator', name: 'Administrator', links: [] },
    ],
    retired: false,
    allRoles: [],
    allPrivileges: [],
  },
};

// ─── État d'authentification simulé ────────────────────────────────────────

/**
 * true si la session fictive est actuellement "connectée". Permet à
 * l'interception fetch de se comporter comme un vrai backend face à un
 * logout (DELETE /session) : sans ce suivi, un logout suivi de
 * refetchCurrentUser() (c'est le flux réel de performLogout(), voir
 * esm-login-app/src/redirect-logout/logout.resource.ts) recevrait à nouveau
 * la session authentifiée fictive et annulerait silencieusement le logout.
 */
let _bypassAuthenticated = true;

// ─── Injection de la session fictive ───────────────────────────────────────

/**
 * Injecte la session fictive dans le sessionStore global, exactement comme
 * si handleSessionResponse() venait de recevoir une réponse 200 authentifiée
 * du backend. Idempotent — peut être appelée plusieurs fois sans effet de bord.
 *
 * N'appelle PAS handleSessionResponse()/egenFetch() : on écrit directement
 * dans le store, ce qui évite tout aller-retour (même intercepté) et
 * garantit un état synchrone dès le premier appel, sans dépendre du cycle
 * de vie fetch (backoff, compteurs d'échecs, etc. — voir current-user.ts).
 */
function injectDevBypassSession(): SessionStore {
  _bypassAuthenticated = true;
  const bypassStore: SessionStore = {
    loaded: true,
    session: { ...DEV_BYPASS_SESSION },
  };
  sessionStore.setState(bypassStore);
  return bypassStore;
}

const DEV_BYPASS_LOGGED_OUT_SESSION = { authenticated: false, sessionId: '' };

// ─── Interception fetch ───────────────────────────────────────────────────────

let _fetchIntercepted = false;

/**
 * Intercepte window.fetch pour le session endpoint et simule un vrai
 * backend, y compris pour le logout :
 *   - DELETE /session  → marque la session fictive comme déconnectée et
 *                         renvoie {authenticated:false}, comme un vrai
 *                         backend le ferait.
 *   - GET (ou autre) /session → renvoie la session fictive authentifiée,
 *                         SAUF si un logout a eu lieu depuis (voir
 *                         _bypassAuthenticated) — dans ce cas renvoie aussi
 *                         {authenticated:false}, jusqu'au prochain
 *                         injectDevBypassSession() (soumission du formulaire
 *                         de login).
 *
 * Sans cette logique, refetchCurrentUser() (appelé juste après un logout
 * dans performLogout()) recevrait la session authentifiée fictive et
 * annulerait silencieusement la déconnexion.
 */
export function interceptSessionFetch(): void {
  if (_fetchIntercepted || typeof window === 'undefined') return;
  _fetchIntercepted = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function devBypassFetch(input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

    // Intercepter uniquement le session endpoint
    if (url.includes(sessionEndpoint) || url.includes('/ws/rest/v1/session')) {
      if (method === 'DELETE') {
        _bypassAuthenticated = false;
        return new Response(null, {
          status: 204,
          headers: { 'X-Dev-Bypass': 'true' },
        });
      }

      const body = _bypassAuthenticated ? DEV_BYPASS_SESSION : DEV_BYPASS_LOGGED_OUT_SESSION;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Bypass': 'true',
        },
      });
    }

    // Tous les autres appels passent normalement
    return originalFetch(input, init);
  };
}

/**
 * Retire l'interception fetch (pour les tests ou le cleanup).
 */
export function removeSessionFetchInterception(): void {
  _fetchIntercepted = false;
  // Note : on ne peut pas restaurer l'original ici car on n'a pas de ref directe.
  // Dans les tests, recharger le module suffit.
}

// ─── Initialisation complète du bypass ───────────────────────────────────────

/**
 * Applique le bypass complet, comme une vraie session déjà établie :
 *   1. Injecte IMMÉDIATEMENT la session fictive dans le sessionStore global
 *      (voir @egen/esm-state — c'est le même store, quel que soit le
 *      conteneur fédéré qui appelle getSessionStore()/useSession() ensuite,
 *      à condition que @egen/esm-state soit bien partagé en singleton — voir
 *      le commentaire de tête de fichier).
 *   2. Intercepte window.fetch pour le session endpoint (filet de sécurité
 *      pour tout refetch explicite ultérieur).
 *
 * Doit être appelé UNE SEULE FOIS, au plus tôt dans run.ts (avant tout
 * composant React, avant tout appel à getSessionStore()) — AVANT le montage
 * de la moindre app, pour qu'aucun composant ne voie jamais un état
 * "non authentifié" ni ne déclenche de Suspense en attente d'un fetch.
 */
export function initDevAuthBypass(): void {
  if (!isDevAuthBypassEnabled()) return;

  console.warn(
    '[EGEN] ⚠️  EGEN_DEV_NO_AUTH=true — Bypass dev actif. Session admin fictive injectée ' +
      'globalement (comme une vraie connexion backend). NE PAS utiliser en production.',
  );

  injectDevBypassSession();
  interceptSessionFetch();
}

// ─── Bypass pour la page de login ─────────────────────────────────────────────

/**
 * Utilisé dans le handleSubmit du login pour skiper l'appel réseau.
 * Retourne la SessionStore fictive si le bypass est actif, null sinon.
 *
 * NOTE : avec l'injection au boot (initDevAuthBypass) et l'interception
 * fetch actives, ce wrapper n'est plus strictement nécessaire — la session
 * est déjà présente avant même que l'utilisateur atteigne le formulaire.
 * Il reste utile pour le flux explicite de soumission du formulaire de
 * login (retourne immédiatement la session au lieu de laisser
 * refetchCurrentUser() faire un aller-retour, même intercepté), et comme
 * couche de sécurité si jamais l'injection au boot venait à être retirée.
 */
export function applyDevAuthBypassForLogin(): SessionStore | null {
  if (!isDevAuthBypassEnabled()) return null;
  return injectDevBypassSession();
}
