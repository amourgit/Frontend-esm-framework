/** @module @category API */

/**
 * Fournisseur d'autorisation d'`egenFetch`.
 *
 * Par défaut (Web) AUCUN fournisseur n'est posé : l'authentification reste portée par le cookie de session et
 * `egenFetch` se comporte exactement comme avant. Une cible native pose un fournisseur au démarrage : le jeton
 * vit dans le Host (Keychain/Keystore), jamais dans ce package ni dans le WebView.
 *
 * @category API
 */
export interface AuthorizationProvider {
  /** Valeur de l'en-tête `Authorization` (ex. `"Bearer …"`), ou `null` s'il n'y a pas de session. */
  getAuthorization(): Promise<string | null>;
  /**
   * Appelé sur HTTP 401 pour obtenir un nouveau jeton. Retourne `true` si un nouveau jeton est disponible
   * (la requête est alors rejouée UNE seule fois). Plusieurs 401 simultanés partagent un seul appel.
   */
  refresh?(): Promise<boolean>;
  /** Politique `credentials` appliquée aux requêtes qui n'en précisent pas (natif : `'omit'`, pas de cookie). */
  credentials?: RequestCredentials;
}

let provider: AuthorizationProvider | null = null;
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Pose (ou retire, avec `null`) le fournisseur d'autorisation d'`egenFetch`.
 *
 * @category API
 */
export function setAuthorizationProvider(newProvider: AuthorizationProvider | null): void {
  provider = newProvider;
  refreshInFlight = null;
}

/** @internal */
export function getAuthorizationProvider(): AuthorizationProvider | null {
  return provider;
}

/**
 * Rafraîchit l'autorisation en « single-flight » : tous les appelants simultanés partagent la même promesse.
 * Un échec du fournisseur est traité comme « pas de nouveau jeton » (`false`).
 *
 * @internal
 */
export function refreshAuthorization(): Promise<boolean> {
  const current = provider;
  if (!current?.refresh) {
    return Promise.resolve(false);
  }

  if (!refreshInFlight) {
    refreshInFlight = current.refresh().then(
      (refreshed) => {
        refreshInFlight = null;
        return refreshed;
      },
      () => {
        refreshInFlight = null;
        return false;
      },
    );
  }

  return refreshInFlight;
}
