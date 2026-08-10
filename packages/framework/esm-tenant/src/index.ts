// ============================================================================
//  @egen/esm-tenant — Point d'entrée public
// ============================================================================
//
//  Ce fichier expose UNIQUEMENT l'API publique stable du package.
//  Les imports internes (context/, config/, utils/) sont des détails
//  d'implémentation et ne doivent pas être importés directement par les apps.
//
//  REFONTE DU 8 AOÛT 2026 : ce package a une seule responsabilité —
//  CAPTURER l'ID du tenant (URL, storage, JWT…) et le RENDRE DISPONIBLE
//  globalement (store + window). Il n'y a plus de registry locale de
//  tenants connus, plus de vérification (existence, statut suspendu,
//  permissions, apps autorisées, thème par tenant) : tout cela est une
//  responsabilité BACKEND. Voir types.ts pour le détail de cette
//  philosophie, et docs/analyse-esm-tenant.md pour l'historique complet.
//
//  USAGE RECOMMANDÉ DANS UNE APP :
//  ─────────────────────────────────
//  import {
//    // React hooks — usage courant dans les composants
//    useTenant, useTenantMode, useTenantStatus, useIsMultiTenant,
//    useSwitchTenant,
//    // React component
//    TenantProvider, useTenantContext,
//    // API non-React (pour l'accès HTTP/service simple — ID tenant,
//    // headers) — préférer @egen/esm-api à la place (getTenantId,
//    // tenantHeaders, egenFetch) : c'est cette version qui est câblée
//    // dans le client HTTP central du monorepo. Voir les JSDoc
//    // @deprecated dans utils/tenant-utils.ts.
//    isTenantSystemActive, isMultiTenantMode, isTenantActive,
//    onTenantChange, buildTenantUrl,
//    // Utilitaires de domaine (hostname ↔ tenant) — source unique, à
//    // réutiliser plutôt que de réimplémenter localement
//    inferRootDomain, extractSubdomain, buildTenantSubdomainUrl,
//    // Setup (shell uniquement)
//    setupTenantSystem, switchTenant, recaptureTenant, storeHeaderTenantId,
//  } from '@egen/esm-tenant';
// ============================================================================

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  TenantId,
  TenantMode,
  TenantStatus,
  TenantSystemConfig,
  TenantStore,
  TenantChangedEvent,
  TenantResolutionStrategy,
  TenantPathConfig,
  TenantJwtConfig,
} from './types';

// ── Setup (shell) ──────────────────────────────────────────────────────────
export { setupTenantSystem, switchTenant, recaptureTenant, storeHeaderTenantId } from './setup';

// ── React Hooks ────────────────────────────────────────────────────────────
export { useTenant, useTenantMode, useTenantStatus, useIsMultiTenant, useSwitchTenant } from './hooks/useTenant';

// ── React Components ───────────────────────────────────────────────────────
export { TenantProvider, useTenantContext } from './hooks/TenantProvider';

export type { TenantProviderProps } from './hooks/TenantProvider';

// ── API non-React (services, intercepteurs, utilitaires) ──────────────────
export {
  getCurrentTenantId,
  isTenantSystemActive,
  isMultiTenantMode,
  isTenantActive,
  onTenantChange,
  buildTenantUrl,
  getTenantHeaders,
  fetchWithTenant,
} from './utils/tenant-utils';

// ── Store (accès direct via useStore(tenantStore) dans esm-react-utils) ─────
// Usage: import { tenantStore } from '@egen/esm-tenant';
//        import { useStore } from '@egen/esm-react-utils';
//        const { tenantId, mode } = useStore(tenantStore);
export { tenantStore, getTenantStoreState, getActiveTenantId, getTenantSystemMode, subscribeTenantStore } from './context/store';

// ── Résolution d'environnement ─────────────────────────────────────────────
export { resolveConfigFromEnv, isTenantModeEnabledFromEnv } from './config/env';

// ── Utilitaires de domaine (hostname ↔ tenant) ─────────────────────────────
// Source unique de vérité — voir utils/domain-utils.ts. À utiliser par toute
// app qui doit construire ou analyser une URL de sous-domaine tenant (garde
// de routage, sélecteur de tenant, etc.) plutôt que de réimplémenter la
// même heuristique localement.
export { isLocalhostOrIp, inferRootDomain, extractSubdomain, buildTenantSubdomainUrl } from './utils/domain-utils';
