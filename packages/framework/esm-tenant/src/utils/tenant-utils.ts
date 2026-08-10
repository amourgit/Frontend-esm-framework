// ============================================================================
//  @egen/esm-tenant — Utilitaires publics
// ============================================================================
//
//  RELATION AVEC @egen/esm-api :
//  ──────────────────────────────
//  @egen/esm-api expose un sous-ensemble de ces mêmes informations (lecture
//  du store tenant, sans importer ce package — voir esm-api/src/tenant.ts)
//  pour rester utilisable sans dépendance runtime sur @egen/esm-tenant.
//  C'est CETTE version (@egen/esm-api) qui est effectivement câblée dans le
//  client HTTP central du monorepo (`egenFetch`, voir
//  esm-api/src/egen-fetch.ts) : le header X-Tenant-ID y est injecté
//  automatiquement, sans action requise de l'appelant.
//
//  Les fonctions ci-dessous marquées @deprecated ont un équivalent strict
//  côté esm-api — les utiliser depuis esm-api si le seul besoin est un accès
//  HTTP/synchrone simple.
//
//  Refonte du 8 août 2026 : toutes les fonctions lisant des métadonnées de
//  tenant (nom, feature flags, permissions, thème…) ont été retirées — ce
//  package ne connaît plus que l'ID brut capturé. Voir types.ts.
// ============================================================================

import type { TenantId } from '../types';
import { tenantStore, getActiveTenantId, getTenantSystemMode, getTenantStoreState } from '../context/store';

// ---------------------------------------------------------------------------
// Accès synchrone (hors React — pour services, intercepteurs, etc.)
// ---------------------------------------------------------------------------

/**
 * Retourne l'ID du tenant actif de manière synchrone (sans React).
 * Utile dans les intercepteurs fetch, les services, etc.
 *
 * @deprecated Préférer `getTenantId()` de `@egen/esm-api` — c'est cette
 * version qui est utilisée par le client HTTP central (`egenFetch`) et qui
 * n'a aucune dépendance runtime sur ce package.
 */
export function getCurrentTenantId(): TenantId | undefined {
  return getActiveTenantId() ?? undefined;
}

/** Retourne true si le système tenant est activé (mode !== "off"). */
export function isTenantSystemActive(): boolean {
  return getTenantSystemMode() !== 'off';
}

/**
 * Retourne true si le mode multi-tenant est actif.
 * @deprecated Utiliser `isMultiTenant()` de `@egen/esm-api` — déjà utilisée
 * ainsi dans esm-login-app et esm-primary-navigation-app.
 */
export function isMultiTenantMode(): boolean {
  return getTenantSystemMode() === 'multi';
}

/** Retourne true si un tenant spécifique est actif. */
export function isTenantActive(tenantId: TenantId): boolean {
  return getActiveTenantId() === tenantId;
}

/**
 * S'abonne aux changements de tenant actif.
 * Retourne une fonction de nettoyage.
 *
 * @example
 * ```ts
 * const unsubscribe = onTenantChange((tenantId) => {
 *   refreshApiClient(tenantId);
 * });
 * ```
 */
export function onTenantChange(callback: (tenantId: TenantId | null) => void): () => void {
  let previous: TenantId | null = getActiveTenantId();

  return tenantStore.subscribe((state) => {
    if (state.tenantId !== previous) {
      previous = state.tenantId;
      callback(state.tenantId);
    }
  });
}

/**
 * Construit une URL en préfixant le path du tenant si nécessaire.
 * Utile pour les stratégies de routing basées sur le path.
 *
 * @example
 * ```ts
 * buildTenantUrl('/dashboard') // → '/t/acme/dashboard' si pathPrefix='/t/'
 * ```
 */
export function buildTenantUrl(path: string, tenantId?: TenantId): string {
  const state = getTenantStoreState();
  const id = tenantId ?? state.tenantId;
  if (!id || state.mode !== 'multi') return path;

  const prefix = state.config.pathConfig?.prefix;
  if (!prefix) return path;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${id}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// Intercept de headers HTTP
// ---------------------------------------------------------------------------

/**
 * Retourne les headers HTTP à ajouter à chaque requête.
 * @deprecated Utiliser `tenantHeaders()` de `@egen/esm-api`. Mieux encore :
 * `egenFetch()` (aussi dans `@egen/esm-api`) injecte déjà automatiquement
 * X-Tenant-ID sur chaque requête — dans la plupart des cas, aucun appel
 * manuel n'est nécessaire (voir esm-api/src/egen-fetch.ts).
 * @example `{ 'X-Tenant-ID': 'acme' }` ou `{}` si mode "off"/aucun tenant
 */
export function getTenantHeaders(): Record<string, string> {
  const id = getActiveTenantId();
  return id ? { 'X-Tenant-ID': id } : {};
}

/**
 * Wrapper fetch qui ajoute automatiquement les headers tenant.
 * @deprecated Utiliser `egenFetch()` de `@egen/esm-api`, qui fait déjà cette
 * injection pour toutes les requêtes passant par le client HTTP central du
 * monorepo (voir esm-api/src/egen-fetch.ts). Cette fonction reste utile
 * uniquement pour un `fetch()` natif ponctuel, hors du client central.
 * @example
 * ```ts
 * const response = await fetchWithTenant('/api/students');
 * ```
 */
export async function fetchWithTenant(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = getTenantHeaders();
  const merged: RequestInit = {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  };
  return fetch(url, merged);
}
