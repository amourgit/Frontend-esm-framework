// ============================================================================
//  @egen/esm-tenant — Orchestrateur du système tenant
// ============================================================================
//
//  Rôle UNIQUE : capturer le tenant depuis l'URL (ou une autre source
//  client), le rendre disponible dans le store global, et notifier les
//  éventuels abonnés. AUCUNE validation, AUCUN accès réseau, AUCUNE donnée
//  de thème/permissions locale — voir types.ts pour la philosophie.
// ============================================================================

import type { TenantSystemConfig, TenantId, TenantResolutionStrategy } from './types';
import { resolveConfigFromEnv } from './config/env';
import { resolveActiveTenantId, persistActiveTenant, clearPersistedTenant } from './context/resolver';
import { setTenantConfig, setActiveTenantIdInStore, getTenantStoreState } from './context/store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireEsmEvent(name: string, detail: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
}

function activate(tenantId: TenantId | null, source: TenantResolutionStrategy | null, config: TenantSystemConfig): void {
  const previousTenantId = getTenantStoreState().tenantId;

  setActiveTenantIdInStore(tenantId, source);

  if (config.persistActive) {
    if (tenantId) {
      persistActiveTenant(tenantId, config.storageKey ?? 'egen:tenant:active');
    } else {
      clearPersistedTenant(config.storageKey ?? 'egen:tenant:active');
    }
  }

  if (tenantId !== previousTenantId) {
    fireEsmEvent('esm:tenant-changed', { tenantId, previousTenantId, source });
    config.onTenantChange?.(tenantId, source);
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(tenantId ? `[egen/esm-tenant] ✅ Tenant capturé : "${tenantId}" (via "${source}")` : '[egen/esm-tenant] Aucun tenant capturé.');
  }
}

// ---------------------------------------------------------------------------
// API principale
// ---------------------------------------------------------------------------

/**
 * Initialise le système de capture des tenants.
 * À appeler une seule fois au boot du shell.
 *
 * Purement synchrone (aucun accès réseau) — pas de registry à charger.
 *
 * @example
 * ```ts
 * // Mode multi, capture depuis l'URL (sous-domaine, query, etc.) :
 * setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
 *
 * // Mode single, tenant forcé :
 * setupTenantSystem({ mode: 'single', defaultTenantId: 'civitas' });
 *
 * // Tout depuis les variables d'environnement (EGEN_TENANT_MODE, etc.) :
 * setupTenantSystem();
 * ```
 */
export function setupTenantSystem(userConfig: Partial<TenantSystemConfig> = {}): void {
  // 1. Fusion : env < userConfig (userConfig est prioritaire)
  const envConfig = resolveConfigFromEnv();
  const config: TenantSystemConfig = {
    mode: 'off',
    persistActive: true,
    storageKey: 'egen:tenant:active',
    resolutionOrder: ['subdomain', 'path', 'query', 'jwt', 'header', 'localStorage', 'static'],
    ...envConfig,
    ...userConfig,
    pathConfig: { ...envConfig.pathConfig, ...userConfig.pathConfig },
    jwtConfig: { claim: 'tenantId', ...envConfig.jwtConfig, ...userConfig.jwtConfig },
  };

  setTenantConfig(config);

  if (config.mode === 'off') {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[egen/esm-tenant] Système tenant désactivé (mode: "off").');
    }
    return;
  }

  if (config.mode === 'single') {
    const targetId = config.defaultTenantId ?? null;
    activate(targetId, targetId ? 'static' : null, config);
    return;
  }

  // Mode "multi" : capture dynamique
  const resolved = resolveActiveTenantId(config);
  activate(resolved?.tenantId ?? null, resolved?.source ?? null, config);
}

/**
 * Change le tenant actif à la volée (mode "multi" uniquement).
 * Ne fait AUCUNE vérification — accepte n'importe quelle valeur, exactement
 * comme la capture initiale depuis l'URL.
 *
 * @example
 * ```ts
 * switchTenant('acme-corp');
 * switchTenant(null); // efface le tenant actif
 * ```
 */
export function switchTenant(tenantId: TenantId | null): void {
  const state = getTenantStoreState();

  if (state.mode === 'off') {
    console.warn('[egen/esm-tenant] switchTenant() ignoré : mode "off".');
    return;
  }
  if (state.mode === 'single') {
    console.warn('[egen/esm-tenant] switchTenant() ignoré : mode "single".');
    return;
  }

  activate(tenantId, tenantId ? 'static' : null, state.config);
}

/**
 * Relit les sources de capture (URL, storage, JWT…) et ré-active le tenant
 * en résultant. Utile après une navigation programmatique qui changerait
 * l'URL sans recharger la page complète.
 */
export function recaptureTenant(): void {
  const state = getTenantStoreState();
  if (state.mode === 'off' || state.mode === 'single') return;

  const resolved = resolveActiveTenantId(state.config);
  activate(resolved?.tenantId ?? null, resolved?.source ?? null, state.config);
}

// Re-export pratique
export { storeHeaderTenantId } from './context/resolver';
