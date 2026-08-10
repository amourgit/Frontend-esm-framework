// ============================================================================
//  @egen/esm-api — Accès synchrone au tenant courant (lecture seule)
// ============================================================================
//
//  Ce module fournit des fonctions utilitaires SYNCHRONES pour accéder à
//  l'ID du tenant courant depuis n'importe quel service, intercepteur
//  fetch, ou code non-React — exactement comme `getSessionStore()` pour la
//  session utilisateur.
//
//  IMPORTANT : ce fichier NE dépend PAS de @egen/esm-tenant AU RUNTIME. Il
//  lit le store via le registre global `availableStores` de @egen/esm-state
//  (par nom "tenant"), ce qui évite toute dépendance circulaire/bundle entre
//  esm-api et esm-tenant. Si le store tenant n'est pas encore initialisé,
//  les fonctions retournent undefined/null.
//
//  Le SEUL lien avec @egen/esm-tenant est un `import type` ci-dessous — il
//  est intégralement effacé à la compilation (aucun code, aucun bundle,
//  aucun import runtime). Il garantit seulement que `MinimalTenantState`
//  reste un sous-ensemble structurellement compatible du vrai `TenantStore`
//  et ne dérive pas silencieusement de lui au fil du temps.
//
//  REFONTE DU 8 AOÛT 2026 : ce module ne connaît plus que l'ID brut du
//  tenant capturé (`tenantId`) — plus de nom, thème, locale, apiBaseUrl,
//  permissions ou feature flags associés (ce concept de registry locale de
//  tenants a été supprimé, voir @egen/esm-tenant/src/types.ts). Toute
//  donnée de ce type doit désormais venir d'un appel backend explicite,
//  scopé par le header X-Tenant-ID que ce module injecte déjà (voir
//  `tenantHeaders()` / `egen-fetch.ts`).
//
//  USAGE TYPIQUE (dans un intercepteur fetch) :
//  ```ts
//  import { getTenantId, tenantHeaders } from '@egen/esm-api';
//
//  async function myFetch(url: string, init?: RequestInit) {
//    return fetch(url, { ...init, headers: { ...tenantHeaders(), ...init?.headers } });
//  }
//  ```
//
//  Pour un accès RÉACTIF (React), préférer les hooks de @egen/esm-tenant
//  directement (useTenant, useTenantMode...) plutôt que ce module, qui ne
//  couvre volontairement que la surface HTTP/synchrone minimale.
// ============================================================================

import { getGlobalStore } from '@egen/esm-state';
import type { TenantMode } from '@egen/esm-tenant';

type MinimalTenantState = {
  tenantId: string | null;
  mode: TenantMode;
};

function getTenantState(): MinimalTenantState | null {
  const store = getGlobalStore<MinimalTenantState>('tenant');
  return store?.getState() ?? null;
}

/**
 * Retourne l'ID du tenant actif, ou `undefined` si mode "off" / non capturé.
 * Synchrone — utilisable dans des intercepteurs fetch, services, etc.
 *
 * @category Tenant
 */
export function getTenantId(): string | undefined {
  return getTenantState()?.tenantId ?? undefined;
}

/**
 * Retourne les headers HTTP à ajouter à chaque requête vers le backend.
 * Retourne `{}` si aucun tenant actif ou mode "off".
 *
 * @example
 * ```ts
 * import { tenantHeaders } from '@egen/esm-api';
 * const response = await fetch(url, { headers: { ...tenantHeaders() } });
 * ```
 * @category Tenant
 */
export function tenantHeaders(): Record<string, string> {
  const id = getTenantId();
  return id ? { 'X-Tenant-ID': id } : {};
}

/**
 * Retourne true si le mode multi-tenant est actif.
 * @category Tenant
 */
export function isMultiTenant(): boolean {
  return getTenantState()?.mode === 'multi';
}

/**
 * S'abonne aux changements du store tenant (capture initiale, switchTenant…).
 * Retourne un no-op si le store tenant n'est pas encore initialisé (ex:
 * @egen/esm-tenant pas encore chargé) — non bloquant, cohérent avec le
 * reste de ce module qui dégrade toujours silencieusement plutôt que de lever.
 *
 * @example
 * ```ts
 * import { subscribeTenant, getTenantId } from '@egen/esm-api';
 * const unsubscribe = subscribeTenant(() => refreshFor(getTenantId()));
 * ```
 * @category Tenant
 */
export function subscribeTenant(callback: () => void): () => void {
  const store = getGlobalStore<MinimalTenantState>('tenant');
  if (!store) return () => {};
  return store.subscribe(callback);
}
