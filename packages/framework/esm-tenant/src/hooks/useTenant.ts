// ============================================================================
//  @egen/esm-tenant — Hooks React
// ============================================================================
//
//  Tous les hooks suivent le même pattern que les hooks EGEN existants
//  (useFeatureFlag, useSession, useStore) pour une cohérence maximale.
//
//  Surface volontairement minimale (refonte du 8 août 2026) : ce package ne
//  fait plus que CAPTURER et EXPOSER le tenant courant. Il n'y a plus de
//  hooks de permission/validation (useTenantAccess, TenantGuard…) ni de
//  métadonnées tenant (nom, thème, feature flags…) — voir types.ts.
//
//  USAGE DANS UNE APP MICROFRONTEND :
//  ───────────────────────────────────
//  ```tsx
//  import { useTenant } from '@egen/esm-tenant';
//
//  function MyPage() {
//    const tenantId = useTenant();
//    return <div>Espace : {tenantId ?? 'général'}</div>;
//  }
//  ```
// ============================================================================

/** @module @category Tenant */

import { useState, useEffect, useCallback } from 'react';
import type { TenantMode, TenantStatus, TenantStore, TenantId } from '../types';
import { tenantStore } from '../context/store';
import { switchTenant } from '../setup';

// ---------------------------------------------------------------------------
// Hook bas niveau : abonnement direct au store (sans dépendance circulaire
// vers esm-react-utils — esm-tenant est un package plus bas dans la chaîne)
// ---------------------------------------------------------------------------

function useTenantStoreSelector<T>(select: (state: ReturnType<typeof tenantStore.getState>) => T): T {
  const [value, setValue] = useState<T>(() => select(tenantStore.getState()));

  useEffect(() => {
    // Sync initiale (cas où le store a muté entre le render et l'effet)
    setValue(select(tenantStore.getState()));
    return tenantStore.subscribe((state) => {
      setValue(select(state));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

// ---------------------------------------------------------------------------
// Hooks publics
// ---------------------------------------------------------------------------

/**
 * Retourne l'ID du tenant actuellement capturé, ou `null` si aucun (mode
 * "off", ou URL/contexte sans tenant). Réactif : re-rend le composant à
 * chaque changement.
 *
 * @category Tenant
 * @example
 * ```tsx
 * function Header() {
 *   const tenantId = useTenant();
 *   return <h1>{tenantId ?? 'Espace général'}</h1>;
 * }
 * ```
 */
export function useTenant(): TenantId | null {
  return useTenantStoreSelector((s) => s.tenantId);
}

/**
 * Retourne le mode de fonctionnement actif du système tenant.
 * @returns `"off"` | `"single"` | `"multi"`
 * @category Tenant
 */
export function useTenantMode(): TenantMode {
  return useTenantStoreSelector((s) => s.mode);
}

/**
 * Retourne le statut courant du système tenant.
 * @returns `"off"` | `"idle"` | `"active"`
 * @category Tenant
 */
export function useTenantStatus(): TenantStatus {
  return useTenantStoreSelector((s) => s.status);
}

/**
 * Retourne `true` si le mode "multi" est actif.
 * @category Tenant
 */
export function useIsMultiTenant(): boolean {
  return useTenantStoreSelector((s) => s.mode === 'multi');
}

/**
 * Retourne une fonction pour changer le tenant actif depuis l'UI (mode
 * "multi" uniquement), ainsi qu'un état `switching` pendant la transition.
 * N'effectue AUCUNE vérification — accepte n'importe quel ID.
 *
 * @category Tenant
 * @example
 * ```tsx
 * function TenantSwitcher({ targetId }: { targetId: string }) {
 *   const { switchTo, switching } = useSwitchTenant();
 *   return (
 *     <button onClick={() => switchTo(targetId)} disabled={switching}>
 *       Changer d'espace
 *     </button>
 *   );
 * }
 * ```
 */
export function useSwitchTenant(): {
  switchTo: (tenantId: string | null) => void;
  switching: boolean;
} {
  const [switching, setSwitching] = useState(false);

  const switchTo = useCallback((tenantId: string | null) => {
    setSwitching(true);
    try {
      switchTenant(tenantId);
    } finally {
      setSwitching(false);
    }
  }, []);

  return { switchTo, switching };
}
