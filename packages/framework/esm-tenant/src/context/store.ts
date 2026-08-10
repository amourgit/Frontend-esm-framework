// ============================================================================
//  @egen/esm-tenant — Store Zustand global du système tenant
// ============================================================================
//
//  Le store est le point central de vérité pour le tenant CAPTURÉ au
//  runtime. Il suit exactement le même pattern que les autres stores EGEN
//  (esm-feature-flags, esm-state) pour une intégration sans friction.
//
//  Ce store ne contient QUE ce qui a été capturé (id, source, timestamp) —
//  aucune métadonnée (nom, thème, permissions…) : ce concept n'existe plus
//  côté frontend (voir types.ts). C'est exactement ce que consulte
//  `@egen/esm-api` (getTenantId, tenantHeaders) pour injecter le header
//  `X-Tenant-ID` sur chaque requête backend.
//
//  IMPORTANT — SINGLETON MODULE FEDERATION :
//  Ce module DOIT être partagé en singleton via Module Federation pour que
//  toutes les microfrontends lisent le même état. Configurez :
//    shared: { '@egen/esm-tenant': { singleton: true, eager: true } }
// ============================================================================

import { createGlobalStore } from '@egen/esm-state';
import type { TenantStore, TenantId, TenantMode, TenantResolutionStrategy, TenantSystemConfig } from '../types';

const DEFAULT_CONFIG: TenantSystemConfig = {
  mode: 'off',
  resolutionOrder: ['subdomain', 'path', 'query', 'jwt', 'header', 'localStorage', 'static'],
  persistActive: true,
  storageKey: 'egen:tenant:active',
};

/**
 * Store global Zustand du système tenant.
 * Enregistré sous le nom "tenant" dans le registre EGEN.
 *
 * Usage direct (avancé) :
 * ```ts
 * import { tenantStore } from '@egen/esm-tenant';
 * import { useStore } from '@egen/esm-react-utils';
 *
 * const { tenantId, mode } = useStore(tenantStore);
 * ```
 */
export const tenantStore = createGlobalStore<TenantStore>('tenant', {
  mode: 'off',
  status: 'off',
  tenantId: null,
  source: null,
  resolvedAt: null,
  config: DEFAULT_CONFIG,
});

// ---------------------------------------------------------------------------
// Mutations internes
// ---------------------------------------------------------------------------

/** @internal */
export function setActiveTenantIdInStore(tenantId: TenantId | null, source: TenantResolutionStrategy | null): void {
  tenantStore.setState((s) => ({
    ...s,
    tenantId,
    source,
    status: s.mode === 'off' ? 'off' : tenantId ? 'active' : 'idle',
    resolvedAt: tenantId ? Date.now() : null,
  }));
}

/** @internal */
/**
 * @internal
 * Remplace intégralement la config active. Attend une config COMPLÈTE et
 * déjà résolue (c'est setupTenantSystem() qui construit cet objet complet
 * à partir des défauts + env + options explicites — voir setup.ts). Un
 * remplacement plutôt qu'une fusion avec l'ancienne config est essentiel
 * pour que setupTenantSystem() reste idempotent d'un appel à l'autre : sans
 * ça, un champ optionnel (ex: rootDomain) omis lors d'un second appel
 * resterait silencieusement figé à sa valeur du premier appel au lieu
 * d'être effacé.
 */
export function setTenantConfig(config: TenantSystemConfig): void {
  tenantStore.setState((s) => ({
    ...s,
    mode: config.mode,
    status: config.mode === 'off' ? 'off' : s.status,
    config,
  }));
}

// ---------------------------------------------------------------------------
// Getters synchrones publics
// ---------------------------------------------------------------------------

/** @category Tenant */
export function getTenantStoreState(): TenantStore {
  return tenantStore.getState();
}

/** Retourne l'ID du tenant actuellement capturé, ou `null`. @category Tenant */
export function getActiveTenantId(): TenantId | null {
  return tenantStore.getState().tenantId;
}

/** @category Tenant */
export function getTenantSystemMode(): TenantMode {
  return tenantStore.getState().mode;
}

/**
 * S'abonne aux changements du store tenant.
 * @returns Fonction de désabonnement.
 * @category Tenant
 */
export function subscribeTenantStore(listener: (state: TenantStore) => void): () => void {
  return tenantStore.subscribe(listener);
}

// ---------------------------------------------------------------------------
// Reset (tests uniquement)
// ---------------------------------------------------------------------------

/** @internal */
export function resetTenantStore(): void {
  tenantStore.setState(
    {
      mode: 'off',
      status: 'off',
      tenantId: null,
      source: null,
      resolvedAt: null,
      config: DEFAULT_CONFIG,
    },
    true,
  );
}
