import type { AuthorizationProvider } from '@egen-civitas/esm-api';
import type { Platform } from '@egen-civitas/esm-platform';

/**
 * Branche la session native sur `egenFetch` (tâche D4) : le jeton vit dans le Host, jamais dans le WebView.
 *
 * À appeler de façon SYNCHRONE au tout début de `run()`, avant le moindre appel réseau : `setupApiModule()` lance
 * `refetchCurrentUser()` immédiatement, donc avant la fin du handshake. Le fournisseur attend donc `platform.ready`
 * lui-même — `egenFetch` attend `getAuthorization()` avant d'appeler `fetch`, le premier appel de session part
 * avec son jeton.
 *
 * - Web : rien n'est posé (le cookie reste le mécanisme, comportement inchangé). Retourne `false`.
 * - Natif : pose un fournisseur `{ getAuthorization, refresh, credentials: 'omit' }`. Si le Host n'annonce pas la
 *   capacité `session`, pas d'en-tête (`null`) et pas de rafraîchissement : on ne simule jamais une session.
 * - Un handshake en échec (Host incompatible ou absent) fait rejeter `getAuthorization()` avec la `PlatformError`
 *   d'origine : aucune requête API n'est envoyée sans l'autorisation que le Host devait fournir.
 */
export function bindPlatformSession(
  platform: Platform,
  setProvider: (provider: AuthorizationProvider | null) => void,
): boolean {
  if (platform.environment === 'web') {
    return false;
  }

  setProvider({
    // Natif : API cross-origin (origine locale ≠ domaine de l'API) ⇒ jamais de cookie.
    credentials: 'omit',
    async getAuthorization() {
      await platform.ready;
      return platform.has('session') ? platform.session.getAuthorization() : null;
    },
    async refresh() {
      await platform.ready;
      return platform.has('session') ? platform.session.refresh() : false;
    },
  });

  return true;
}
