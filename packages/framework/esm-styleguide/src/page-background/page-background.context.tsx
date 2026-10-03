/** @category Page Background */
import React, { useMemo, useSyncExternalStore } from 'react';
import type { PageBackgroundProps } from './page-background.component.js';
import { pageBackgroundStore, setGlobalPageBackground } from './page-background.store.js';

interface PageBackgroundContextValue {
  config: PageBackgroundProps | null;
  setPageBackground: (config: PageBackgroundProps | null) => void;
}

/**
 * @deprecated N'a plus aucun effet : l'état de l'arrière-plan est désormais un
 * store global (`@egen-civitas/esm-state`), partagé entre toutes les racines
 * React des apps. Le shell monte l'unique `<GlobalPageBackground>` ; une app
 * n'a plus qu'à utiliser `<PageBackground>`. Conservé pour compatibilité :
 * il se contente de rendre ses enfants.
 */
export function PageBackgroundProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const selectConfig = () => pageBackgroundStore.getState().config;

/**
 * Accès direct au gestionnaire d'arrière-plan global. Utilisé en interne par
 * `<GlobalPageBackground>` ; à réserver aux cas où le composant déclaratif
 * `<PageBackground>` ne suffit pas.
 */
export function usePageBackground(): PageBackgroundContextValue {
  const config = useSyncExternalStore(pageBackgroundStore.subscribe, selectConfig, selectConfig);
  return useMemo(() => ({ config, setPageBackground: setGlobalPageBackground }), [config]);
}
