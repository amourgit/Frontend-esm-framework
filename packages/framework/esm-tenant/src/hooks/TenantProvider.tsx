// ============================================================================
//  @egen/esm-tenant — Composant React : Provider
// ============================================================================
//
//  TenantProvider :
//    Wrapper optionnel à placer à la racine d'une app (ou d'un arbre de
//    composants). Expose un Context React avec l'ID du tenant capturé pour
//    les librairies/composants qui préfèrent le Context au hook de store
//    Zustand. Le store reste la source de vérité — le Context est juste
//    une projection.
//
//  Refonte du 8 août 2026 : TenantGuard / TenantRequired /
//  TenantSuspendedBoundary / TenantSelector ont été retirés avec le reste
//  du système de vérification/permission frontend (registry, suspended,
//  allowedApps, permissions) — voir types.ts. Ce fichier ne fait plus que
//  CAPTURER et EXPOSER, sans bloquer ni filtrer aucun rendu.
// ============================================================================

import React, { createContext, useContext, type ReactNode, type FC } from 'react';
import type { TenantId } from '../types';
import { useTenant } from './useTenant';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TenantContextValue {
  tenantId: TenantId | null;
}

const TenantContext = createContext<TenantContextValue>({ tenantId: null });

/** Hook bas niveau pour lire depuis le Context React (sans Zustand) */
export function useTenantContext(): TenantContextValue {
  return useContext(TenantContext);
}

// ---------------------------------------------------------------------------
// TenantProvider
// ---------------------------------------------------------------------------

export interface TenantProviderProps {
  children: ReactNode;
}

/**
 * Provider React qui expose l'ID du tenant capturé via Context.
 * À placer à la racine de l'app shell ou de chaque microfrontend.
 *
 * @example
 * ```tsx
 * export default function Root() {
 *   return (
 *     <TenantProvider>
 *       <App />
 *     </TenantProvider>
 *   );
 * }
 * ```
 */
export const TenantProvider: FC<TenantProviderProps> = ({ children }) => {
  const tenantId = useTenant();
  return <TenantContext.Provider value={{ tenantId }}>{children}</TenantContext.Provider>;
};
