/** @category Page Background */
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { PageBackgroundProps } from './page-background.component.js';

interface PageBackgroundContextValue {
  config: PageBackgroundProps | null;
  setPageBackground: (config: PageBackgroundProps | null) => void;
}

const PageBackgroundContext = createContext<PageBackgroundContextValue>({
  config: null,
  setPageBackground: () => {},
});

/**
 * Fournisseur global du système d'arrière-plan de page. À monter une seule
 * fois, en haut de l'arbre de l'application (typiquement au même niveau que
 * `<GlobalPageBackground />`, voir `page-background.component.tsx`).
 */
export function PageBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PageBackgroundProps | null>(null);

  const value = useMemo(
    () => ({
      config,
      setPageBackground: setConfig,
    }),
    [config],
  );

  return <PageBackgroundContext.Provider value={value}>{children}</PageBackgroundContext.Provider>;
}

/**
 * Accès direct au gestionnaire d'arrière-plan global. Utilisé en interne par
 * `<PageBackground>` et `<GlobalPageBackground>` ; à réserver aux cas où le
 * composant déclaratif `<PageBackground>` ne suffit pas (ex. logique de
 * synchronisation plus complexe qu'un simple montage/démontage de page).
 */
export function usePageBackground(): PageBackgroundContextValue {
  return useContext(PageBackgroundContext);
}
